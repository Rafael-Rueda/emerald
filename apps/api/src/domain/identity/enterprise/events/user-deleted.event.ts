import { User } from "../entities/user.entity";

import { UniqueEntityId } from "@/domain/@shared/entities/unique-entity-id.entity";
import { DomainEvent } from "@/domain/@shared/events/domain-event";

export class UserDeletedEvent implements DomainEvent {
    public ocurredAt: Date;
    private _user: User;

    constructor(user: User) {
        this._user = user;
        this.ocurredAt = new Date();
    }

    getAggregateId(): UniqueEntityId {
        return this._user.id;
    }

    get user(): User {
        return this._user;
    }
}
