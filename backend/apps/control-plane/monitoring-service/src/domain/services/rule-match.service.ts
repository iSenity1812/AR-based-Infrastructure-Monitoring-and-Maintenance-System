import { RuleEvaluationMode } from '../constants/rule-evaluation-mode.enum';
import { RuleOperator } from '../constants/rule-operator.enum';
import { MonitoringInputField } from '../entities/monitoring-input.entity';
import { MonitoringRule } from '../entities/monitoring-rule.entity';

export interface RuleMatchResult {
  matched: boolean;
  observedValue: number | string | boolean | null;
  thresholdValue?: number | string | boolean;
  comparableValue?: number | string | boolean;
  skipReason?: 'missing_metric' | 'missing_threshold' | 'missing_context';
}

export class RuleMatchService {
  evaluate(
    rule: MonitoringRule,
    field?: MonitoringInputField,
    contextField?: MonitoringInputField,
  ): RuleMatchResult {
    const observedValue = field?.value ?? null;

    if (observedValue === null) {
      return {
        matched: false,
        observedValue,
        thresholdValue: rule.thresholdValue,
        skipReason: 'missing_metric',
      };
    }

    if (rule.evaluationMode === RuleEvaluationMode.CAPACITY_RELATIVE) {
      const comparableValue = contextField?.value;
      if (comparableValue === undefined || comparableValue === null) {
        return {
          matched: false,
          observedValue,
          thresholdValue: rule.thresholdValue,
          comparableValue: comparableValue ?? undefined,
          skipReason: 'missing_context',
        };
      }

      return {
        matched: this.compare(observedValue, comparableValue, rule.operator),
        observedValue,
        thresholdValue: rule.thresholdValue,
        comparableValue,
      };
    }

    const thresholdValue = rule.thresholdValue;
    if (thresholdValue === undefined) {
      return {
        matched: false,
        observedValue,
        thresholdValue,
        skipReason: 'missing_threshold',
      };
    }

    return {
      matched: this.compare(observedValue, thresholdValue, rule.operator),
      observedValue,
      thresholdValue,
      comparableValue: thresholdValue,
    };
  }

  private compare(
    left: number | string | boolean,
    right: number | string | boolean,
    operator: RuleOperator,
  ): boolean {
    if (typeof left === 'number' && typeof right === 'number') {
      return this.compareNumbers(left, right, operator);
    }

    if (operator === RuleOperator.EQUAL) {
      return left === right;
    }

    if (operator === RuleOperator.NOT_EQUAL) {
      return left !== right;
    }

    return false;
  }

  private compareNumbers(
    left: number,
    right: number,
    operator: RuleOperator,
  ): boolean {
    switch (operator) {
      case RuleOperator.GREATER_THAN:
        return left > right;
      case RuleOperator.GREATER_THAN_OR_EQUAL:
        return left >= right;
      case RuleOperator.LESS_THAN:
        return left < right;
      case RuleOperator.LESS_THAN_OR_EQUAL:
        return left <= right;
      case RuleOperator.EQUAL:
        return left === right;
      case RuleOperator.NOT_EQUAL:
        return left !== right;
      default:
        return false;
    }
  }
}
