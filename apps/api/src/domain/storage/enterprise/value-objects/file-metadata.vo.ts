import { ValueObject } from "@/domain/@shared/value-objects/value-object.vo";

interface FileMetadataProps {
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
}

export class FileMetadata extends ValueObject<FileMetadataProps> {
    private constructor(props: FileMetadataProps) {
        super(props);
    }

    static create(props: FileMetadataProps): FileMetadata {
        return new FileMetadata(props);
    }

    get mimeType() {
        return this.props.mimeType;
    }

    get size() {
        return this.props.size;
    }

    get width() {
        return this.props.width;
    }

    get height() {
        return this.props.height;
    }

    get isImage(): boolean {
        return this.props.mimeType.startsWith("image/");
    }

    get hasDimensions(): boolean {
        return this.props.width !== undefined && this.props.height !== undefined;
    }

    get sizeInKB(): number {
        return Math.round(this.props.size / 1024);
    }

    get sizeInMB(): number {
        return Math.round((this.props.size / 1024 / 1024) * 100) / 100;
    }
}
