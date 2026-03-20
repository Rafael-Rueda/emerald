import { ValueObject } from "@/domain/@shared/value-objects/value-object.vo";

interface FilePathProps {
    environment: string;
    year: number;
    month: number;
    entityType: string;
    entityId: string;
    filename: string;
}

export class FilePath extends ValueObject<FilePathProps> {
    private constructor(props: FilePathProps) {
        super(props);
    }

    static create(props: FilePathProps): FilePath {
        return new FilePath(props);
    }

    static fromString(path: string): FilePath {
        const parts = path.split("/");
        if (parts.length < 6) {
            throw new Error("Invalid file path format");
        }

        return new FilePath({
            environment: parts[0],
            year: parseInt(parts[1]),
            month: parseInt(parts[2]),
            entityType: parts[3],
            entityId: parts[4],
            filename: parts.slice(5).join("/"),
        });
    }

    static build(entityType: string, entityId: string, filename: string, environment: string): FilePath {
        const now = new Date();
        return new FilePath({
            environment,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            entityType,
            entityId,
            filename,
        });
    }

    get environment() {
        return this.props.environment;
    }

    get year() {
        return this.props.year;
    }

    get month() {
        return this.props.month;
    }

    get entityType() {
        return this.props.entityType;
    }

    get entityId() {
        return this.props.entityId;
    }

    get filename() {
        return this.props.filename;
    }

    toString(): string {
        const monthPadded = this.props.month.toString().padStart(2, "0");
        return `${this.props.environment}/${this.props.year}/${monthPadded}/${this.props.entityType}/${this.props.entityId}/${this.props.filename}`;
    }
}
