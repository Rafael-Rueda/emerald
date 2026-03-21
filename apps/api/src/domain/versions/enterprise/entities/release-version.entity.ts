import { AggregateRoot } from "@/domain/@shared/entities/aggregate-root.entity";

export const RELEASE_VERSION_STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
} as const;

export type ReleaseVersionStatus = (typeof RELEASE_VERSION_STATUS)[keyof typeof RELEASE_VERSION_STATUS];

export interface ReleaseVersionProps {
    spaceId: string;
    key: string;
    label: string;
    status: ReleaseVersionStatus;
    isDefault: boolean;
    publishedAt: Date | null;
}

export class ReleaseVersionEntity extends AggregateRoot<ReleaseVersionProps> {
    private constructor(props: ReleaseVersionProps, id?: string) {
        super(props, id);
    }

    static create(props: ReleaseVersionProps, id?: string) {
        return new ReleaseVersionEntity(props, id);
    }

    get spaceId() {
        return this.props.spaceId;
    }

    get key() {
        return this.props.key;
    }

    get label() {
        return this.props.label;
    }

    get status() {
        return this.props.status;
    }

    get isDefault() {
        return this.props.isDefault;
    }

    get publishedAt() {
        return this.props.publishedAt;
    }

    set key(key: string) {
        this.props.key = key;
        this.touch();
    }

    set label(label: string) {
        this.props.label = label;
        this.touch();
    }

    set status(status: ReleaseVersionStatus) {
        this.props.status = status;
        this.touch();
    }

    set isDefault(isDefault: boolean) {
        this.props.isDefault = isDefault;
        this.touch();
    }

    set publishedAt(publishedAt: Date | null) {
        this.props.publishedAt = publishedAt;
        this.touch();
    }

    private touch() {
        this.updatedAt = new Date();
    }
}
