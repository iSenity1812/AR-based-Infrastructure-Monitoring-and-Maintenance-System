export interface NodeMappingEventPublisherPort {
  publishNodeMapping(nodeCode: string, rackId: string | null): Promise<void>;
}
