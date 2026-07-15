import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type {
  AlertCurrentState,
  AlertCurrentStateStatus,
} from '../../../domain/alert-current-state';
import { AlertCurrentStateRepository } from '../../../application/ports/alert-current-state.repository';
import {
  AlertCurrentStatePersistence,
  type AlertCurrentStateDocument,
} from './alert-current-state.schema';

@Injectable()
export class AlertCurrentStateMongoRepository
  implements AlertCurrentStateRepository
{
  constructor(
    @InjectModel(AlertCurrentStatePersistence.name)
    private readonly alertCurrentStateModel: Model<AlertCurrentStateDocument>,
  ) {}

  async findByFingerprint(
    fingerprint: string,
  ): Promise<AlertCurrentState | null> {
    const document = await this.alertCurrentStateModel
      .findOne({ fingerprint })
      .lean<AlertCurrentStatePersistence | null>()
      .exec();

    return document ? mapDocumentToAlertCurrentState(document) : null;
  }

  async upsert(state: AlertCurrentState): Promise<void> {
    await this.alertCurrentStateModel
      .updateOne(
        { fingerprint: state.fingerprint },
        { $set: mapAlertCurrentStateToPersistence(state) },
        { upsert: true },
      )
      .exec();
  }

  async listByStatus(
    status: AlertCurrentStateStatus,
  ): Promise<AlertCurrentState[]> {
    const documents = await this.alertCurrentStateModel
      .find({ status })
      .sort({
        severity: -1,
        lastStatusChangedAt: -1,
        alertName: 1,
      })
      .lean<AlertCurrentStatePersistence[]>()
      .exec();

    return documents.map(mapDocumentToAlertCurrentState);
  }

  async listActiveRackAlerts(): Promise<AlertCurrentState[]> {
    const documents = await this.alertCurrentStateModel
      .find({
        scopeType: 'rack',
        status: 'firing',
      })
      .sort({
        severity: -1,
        lastStatusChangedAt: -1,
        alertName: 1,
      })
      .lean<AlertCurrentStatePersistence[]>()
      .exec();

    return documents.map(mapDocumentToAlertCurrentState);
  }

  async listActiveNodeAlerts(): Promise<AlertCurrentState[]> {
    const documents = await this.alertCurrentStateModel
      .find({
        scopeType: 'node',
        status: 'firing',
      })
      .sort({
        severity: -1,
        lastStatusChangedAt: -1,
        alertName: 1,
      })
      .lean<AlertCurrentStatePersistence[]>()
      .exec();

    return documents.map(mapDocumentToAlertCurrentState);
  }

  async listActiveByNodeId(nodeId: string): Promise<AlertCurrentState[]> {
    return this.listActiveBy({ nodeId });
  }

  async listActiveByRackId(rackId: string): Promise<AlertCurrentState[]> {
    return this.listActiveBy({ rackId });
  }

  async listActiveByWorkloadId(
    workloadId: string,
  ): Promise<AlertCurrentState[]> {
    return this.listActiveBy({ workloadId });
  }

  async listActiveByServiceId(serviceId: string): Promise<AlertCurrentState[]> {
    return this.listActiveBy({ serviceId });
  }

  private async listActiveBy(
    selector: Partial<
      Pick<
        AlertCurrentStatePersistence,
        'nodeId' | 'rackId' | 'workloadId' | 'serviceId'
      >
    >,
  ): Promise<AlertCurrentState[]> {
    const documents = await this.alertCurrentStateModel
      .find({
        ...selector,
        status: 'firing',
      })
      .sort({
        severity: -1,
        lastStatusChangedAt: -1,
        alertName: 1,
      })
      .lean<AlertCurrentStatePersistence[]>()
      .exec();

    return documents.map(mapDocumentToAlertCurrentState);
  }
}

export function mapAlertCurrentStateToPersistence(
  state: AlertCurrentState,
): AlertCurrentStatePersistence {
  const scopeFields = mapScopeIdentityToPersistence(state);

  return {
    fingerprint: state.fingerprint,
    alertName: state.alertName,
    rawLabels: state.rawLabels,
    rawAnnotations: state.rawAnnotations,
    scopeType: state.scopeType,
    nodeId: scopeFields.nodeId,
    rackId: scopeFields.rackId,
    workloadId: scopeFields.workloadId,
    serviceId: scopeFields.serviceId,
    severity: state.severity,
    category: state.category,
    status: state.status,
    environment: state.environment,
    team: state.team,
    source: state.source,
    summary: state.summary,
    description: state.description,
    metricKey: state.metricKey,
    observedWindow: state.observedWindow,
    dashboardUrl: state.dashboardUrl,
    runbookUrl: state.runbookUrl,
    currentValue: state.currentValue,
    threshold: state.threshold,
    startsAt: state.startsAt,
    endsAt: state.endsAt,
    lastReceivedAt: state.lastReceivedAt,
    firstSyncedAt: state.firstSyncedAt,
    lastSyncedAt: state.lastSyncedAt,
    lastStatusChangedAt: state.lastStatusChangedAt,
  };
}

function mapScopeIdentityToPersistence(
  state: AlertCurrentState,
): Pick<
  AlertCurrentStatePersistence,
  'nodeId' | 'rackId' | 'workloadId' | 'serviceId'
> {
  switch (state.scopeType) {
    case 'node':
      return {
        nodeId: state.nodeId,
        rackId: state.rackId,
        workloadId: null,
        serviceId: null,
      };
    case 'rack':
      return {
        nodeId: null,
        rackId: state.rackId,
        workloadId: null,
        serviceId: null,
      };
    case 'workload':
      return {
        nodeId: state.nodeId,
        rackId: state.rackId,
        workloadId: state.workloadId,
        serviceId: null,
      };
    case 'service':
      return {
        nodeId: null,
        rackId: null,
        workloadId: null,
        serviceId: state.serviceId,
      };
  }
}

export function mapDocumentToAlertCurrentState(
  document: AlertCurrentStatePersistence,
): AlertCurrentState {
  const base = {
    fingerprint: document.fingerprint,
    alertName: document.alertName,
    rawLabels: document.rawLabels ?? {},
    rawAnnotations: document.rawAnnotations ?? {},
    severity: document.severity,
    status: document.status,
    category: document.category,
    environment: document.environment,
    team: document.team,
    source: document.source,
    summary: document.summary,
    description: document.description,
    metricKey: document.metricKey ?? null,
    observedWindow: document.observedWindow ?? null,
    dashboardUrl: document.dashboardUrl ?? null,
    runbookUrl: document.runbookUrl ?? null,
    currentValue: document.currentValue ?? null,
    threshold: document.threshold ?? null,
    startsAt: document.startsAt,
    endsAt: document.endsAt ?? null,
    lastReceivedAt: document.lastReceivedAt,
    firstSyncedAt: document.firstSyncedAt,
    lastSyncedAt: document.lastSyncedAt,
    lastStatusChangedAt: document.lastStatusChangedAt,
  } as const;

  switch (document.scopeType) {
    case 'node':
      return {
        ...base,
        scopeType: 'node',
        nodeId: document.nodeId ?? '',
        rackId: document.rackId ?? '',
      };
    case 'rack':
      return {
        ...base,
        scopeType: 'rack',
        rackId: document.rackId ?? '',
      };
    case 'workload':
      return {
        ...base,
        scopeType: 'workload',
        workloadId: document.workloadId ?? '',
        nodeId: document.nodeId ?? '',
        rackId: document.rackId ?? '',
      };
    case 'service':
      return {
        ...base,
        scopeType: 'service',
        serviceId: document.serviceId ?? '',
      };
  }
}
