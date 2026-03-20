import { FileDeletedEvent } from "../events/file-deleted.event";
import { FileUploadedEvent } from "../events/file-uploaded.event";
import { FileMetadata } from "../value-objects/file-metadata.vo";
import { FilePath } from "../value-objects/file-path.vo";

import { AggregateRoot } from "@/domain/@shared/entities/aggregate-root.entity";

export interface FileProps {
    entityType: string;
    entityId: string;
    field: string;
    filename: string;
    path: FilePath;
    metadata: FileMetadata;
}

export class File extends AggregateRoot<FileProps> {
    private constructor(props: FileProps, id?: string) {
        super(props, id);
    }

    static create(props: FileProps, id?: string) {
        const file = new File(props, id);
        file.addDomainEvent(new FileUploadedEvent(file));
        return file;
    }

    /**
     * Marks the file for deletion and emits FileDeletedEvent
     */
    delete(): void {
        this.addDomainEvent(new FileDeletedEvent(this));
    }

    get entityType() {
        return this.props.entityType;
    }

    get entityId() {
        return this.props.entityId;
    }

    get field() {
        return this.props.field;
    }

    get filename() {
        return this.props.filename;
    }

    get path() {
        return this.props.path;
    }

    get metadata() {
        return this.props.metadata;
    }

    get mimeType() {
        return this.props.metadata.mimeType;
    }

    get size() {
        return this.props.metadata.size;
    }

    get width() {
        return this.props.metadata.width;
    }

    get height() {
        return this.props.metadata.height;
    }

    get isImage() {
        return this.props.metadata.mimeType.startsWith("image/");
    }

    set filename(filename: string) {
        this.props.filename = filename;
        this.touch();
    }

    set path(path: FilePath) {
        this.props.path = path;
        this.touch();
    }

    set metadata(metadata: FileMetadata) {
        this.props.metadata = metadata;
        this.touch();
    }

    private touch() {
        this.updatedAt = new Date();
    }
}
