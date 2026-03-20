import { UniqueEntityId } from "../entities/unique-entity-id.entity";

export interface DomainEvent {
    ocurredAt: Date;
    getAggregateId(): UniqueEntityId;
}
