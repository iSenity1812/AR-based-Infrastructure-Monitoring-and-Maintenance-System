from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import platform
import shutil
import subprocess
import time
from typing import Any

from ..core.models import CollectorContext, MetricSample
from .base import BaseCollector

try:
    import psutil  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - optional dependency
    psutil = None


class HostCollector(BaseCollector):
    name = "host"
    collector_type = "node"

    def collect(self, context: CollectorContext) -> list[MetricSample]:
        if context.scope != "node":
            raise ValueError(f"HostCollector only supports node scope, got {context.scope!r}")

        timestamp = datetime.now(timezone.utc)
        metric_specs = [
            ("node.cpu_usage_pct", "%", self._read_cpu_usage_pct()),
            ("node.memory_used_pct", "%", self._read_memory_used_pct()),
            ("node.memory_available_mb", "MB", self._read_memory_available_mb()),
            ("node.disk_used_pct", "%", self._read_disk_used_pct()),
            ("node.disk_free_gb", "GB", self._read_disk_free_gb()),
            ("node.process_count", "count", self._read_process_count()),
            ("node.service_running_count", "count", self._read_service_running_count()),
            ("node.uptime_seconds", "seconds", self._read_uptime_seconds()),
        ]

        return [
            MetricSample(
                metric_key=metric_key,
                scope=context.scope,
                scope_id=context.scope_id,
                value=value,
                unit=unit,
                timestamp=timestamp,
            )
            for metric_key, unit, value in metric_specs
        ]

    def _read_cpu_usage_pct(self) -> float:
        if psutil is not None:
            return float(psutil.cpu_percent(interval=0.1))

        system_name = self._system_name()
        if system_name == "windows":
            command = self._powershell_command(
                "(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average"
            )
            return self._run_numeric_command(command)

        if system_name == "linux":
            return self._read_linux_cpu_usage_pct()

        return 0.0

    def _read_memory_used_pct(self) -> float:
        if psutil is not None:
            return float(psutil.virtual_memory().percent)

        system_name = self._system_name()
        if system_name == "windows":
            command = self._powershell_command(
                "$os = Get-CimInstance Win32_OperatingSystem; "
                "[math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 2)"
            )
            return self._run_numeric_command(command)

        if system_name == "linux":
            total_mb, available_mb = self._read_linux_memory_mb()
            if total_mb <= 0:
                return 0.0
            used_mb = max(0.0, total_mb - available_mb)
            return float((used_mb / total_mb) * 100.0)

        return 0.0

    def _read_memory_available_mb(self) -> float:
        if psutil is not None:
            return float(psutil.virtual_memory().available / (1024 * 1024))

        system_name = self._system_name()
        if system_name == "windows":
            command = self._powershell_command(
                "([double](Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory) / 1024"
            )
            return self._run_numeric_command(command)

        if system_name == "linux":
            _, available_mb = self._read_linux_memory_mb()
            return available_mb

        return 0.0

    def _read_disk_used_pct(self) -> float:
        usage = shutil.disk_usage(Path.cwd())
        if usage.total == 0:
            return 0.0
        return float((usage.used / usage.total) * 100.0)

    def _read_disk_free_gb(self) -> float:
        usage = shutil.disk_usage(Path.cwd())
        return float(usage.free / (1024 * 1024 * 1024))

    def _read_process_count(self) -> int:
        if psutil is not None:
            return len(psutil.pids())

        system_name = self._system_name()
        if system_name == "windows":
            command = self._powershell_command("(Get-Process | Measure-Object).Count")
            return self._run_integer_command(command)

        if system_name == "linux":
            return self._count_with_command(["sh", "-lc", "ps -e --no-headers | wc -l"])

        return 0

    def _read_service_running_count(self) -> int:
        system_name = platform.system().lower()
        if system_name == "windows":
            command = self._powershell_command("(Get-Service | Where-Object {$_.Status -eq 'Running'} | Measure-Object).Count")
            return self._run_integer_command(command)

        if system_name == "linux":
            command = [
                "sh",
                "-lc",
                "systemctl list-units --type=service --state=running --no-legend | wc -l",
            ]
            running_services = self._count_with_command(command)
            if running_services > 0:
                return running_services

            return self._count_with_command(["sh", "-lc", "service --status-all 2>/dev/null | grep -c '\\+'"])

        if psutil is not None:
            return self._count_running_services_from_psutil(psutil)

        return 0

    def _read_uptime_seconds(self) -> float:
        if psutil is not None:
            boot_time = psutil.boot_time()
            return max(0.0, datetime.now(timezone.utc).timestamp() - float(boot_time))

        system_name = self._system_name()
        if system_name == "windows":
            command = self._powershell_command(
                "$boot = [DateTimeOffset](Get-CimInstance Win32_OperatingSystem).LastBootUpTime; "
                "([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - $boot.ToUnixTimeSeconds())"
            )
            return self._run_numeric_command(command)

        if system_name == "linux":
            return self._run_numeric_command(["sh", "-lc", "cat /proc/uptime | awk '{print $1}'"])

        return 0.0

    def _count_running_services_from_psutil(self, module: Any) -> int:
        running_count = 0
        for process in module.process_iter(attrs=["name", "status"]):
            status = getattr(process, "info", {}).get("status")
            if status == module.STATUS_RUNNING:
                running_count += 1
        return running_count

    def _count_with_command(self, command: list[str]) -> int:
        try:
            completed_process = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
            )
        except (OSError, subprocess.CalledProcessError):
            return 0

        output = completed_process.stdout.strip()
        if not output:
            return 0

        try:
            return int(output.splitlines()[-1].strip().split(",")[-1].strip('"'))
        except (ValueError, IndexError):
            return 0

    def _powershell_command(self, expression: str) -> list[str]:
        shell = shutil.which("pwsh") or shutil.which("powershell")
        if shell is None:
            return []
        return [shell, "-NoProfile", "-Command", expression]

    def _system_name(self) -> str:
        return platform.system().lower()

    def _read_linux_cpu_usage_pct(self) -> float:
        first = self._read_proc_stat_sample()
        if first is None:
            return 0.0

        time.sleep(0.1)
        second = self._read_proc_stat_sample()
        if second is None:
            return 0.0

        idle_delta = second[1] - first[1]
        total_delta = second[0] - first[0]
        if total_delta <= 0:
            return 0.0

        busy_delta = total_delta - idle_delta
        return max(0.0, min((busy_delta / total_delta) * 100.0, 100.0))

    def _read_proc_stat_sample(self) -> tuple[float, float] | None:
        try:
            with Path("/proc/stat").open("r", encoding="utf-8") as stat_file:
                first_line = stat_file.readline().strip()
        except OSError:
            return None

        parts = first_line.split()
        if len(parts) < 5 or parts[0] != "cpu":
            return None

        values = [float(part) for part in parts[1:]]
        idle = values[3] + (values[4] if len(values) > 4 else 0.0)
        total = sum(values)
        return total, idle

    def _read_linux_memory_mb(self) -> tuple[float, float]:
        meminfo: dict[str, float] = {}
        try:
            with Path("/proc/meminfo").open("r", encoding="utf-8") as meminfo_file:
                for line in meminfo_file:
                    key, _, value = line.partition(":")
                    if not value:
                        continue
                    meminfo[key] = float(value.strip().split()[0])
        except OSError:
            return 0.0, 0.0

        total_kb = meminfo.get("MemTotal", 0.0)
        available_kb = meminfo.get("MemAvailable", meminfo.get("MemFree", 0.0))
        return total_kb / 1024.0, available_kb / 1024.0

    def _run_numeric_command(self, command: list[str]) -> float:
        if not command:
            return 0.0

        try:
            completed_process = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
            )
        except (OSError, subprocess.CalledProcessError):
            return 0.0

        output = completed_process.stdout.strip()
        try:
            return float(output.splitlines()[-1].strip())
        except (ValueError, IndexError):
            return 0.0

    def _run_integer_command(self, command: list[str]) -> int:
        return int(self._run_numeric_command(command))
