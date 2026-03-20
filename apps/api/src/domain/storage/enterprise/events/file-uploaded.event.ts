import { File } from "../entities/file.entity";

import { UniqueEntityId } from "@/domain/@shared/entities/unique-entity-id.entity";
import { DomainEvent } from "@/domain/@shared/events/domain-event";

export class FileUploadedEvent implements DomainEvent {
    public ocurredAt: Date;
    private _file: File;

    constructor(file: File) {
        this._file = file;
        this.ocurredAt = new Date();
    }

    getAggregateId(): UniqueEntityId {
        return this._file.id;
    }

    get file(): File {
        return this._file;
    }

    get entityType(): string {
        return this._file.entityType;
    }

    get entityId(): string {
        return this._file.entityId;
    }

    get field(): string {
        return this._file.field;
    }

    /**
     * Check if this is a user avatar upload
     */
    get isUserAvatar(): boolean {
        return this._file.entityType === "user" && this._file.field === "avatar";
    }
}
