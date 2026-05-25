from __future__ import annotations

from enum import StrEnum


class ScopeType(StrEnum):
    RACK = "rack"
    SWITCH = "switch"
    SWITCH_PORT = "switch_port"
    NODE = "node"
    INTERFACE = "interface"
    SERVICE = "service"
    CONTAINER = "container"
    IPAM = "ipam"
    OPERATIONS = "operations"
