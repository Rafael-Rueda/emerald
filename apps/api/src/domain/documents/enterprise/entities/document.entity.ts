import type { DocumentContent } from "@emerald/contracts";

import { AggregateRoot } from "@/domain/@shared/entities/aggregate-root.entity";

export const DOCUMENT_STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived",
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export interface DocumentProps {
    spaceId: string;
    spaceKey: string;
    releaseVersionId: string;
    title: string;
    slug: string;
    status: DocumentStatus;
    currentRevisionId: string | null;
    currentContentJson: DocumentContent | null;
    createdBy: string;
    updatedBy: string;
}

export class DocumentEntity extends AggregateRoot<DocumentProps> {
    private constructor(props: DocumentProps, id?: string) {
        super(props, id);
    }

    static create(props: DocumentProps, id?: string) {
        return new DocumentEntity(props, id);
    }

    get spaceId() {
        return this.props.spaceId;
    }

    get spaceKey() {
        return this.props.spaceKey;
    }

    get releaseVersionId() {
        return this.props.releaseVersionId;
    }

    get title() {
        return this.props.title;
    }

    get slug() {
        return this.props.slug;
    }

    get status() {
        return this.props.status;
    }

    get currentRevisionId() {
        return this.props.currentRevisionId;
    }

    get currentContentJson() {
        return this.props.currentContentJson;
    }

    get createdBy() {
        return this.props.createdBy;
    }

    get updatedBy() {
        return this.props.updatedBy;
    }

    set title(title: string) {
        this.props.title = title;
        this.touch();
    }

    set status(status: DocumentStatus) {
        this.props.status = status;
        this.touch();
    }

    set currentRevisionId(currentRevisionId: string | null) {
        this.props.currentRevisionId = currentRevisionId;
        this.touch();
    }

    set currentContentJson(contentJson: DocumentContent | null) {
        this.props.currentContentJson = contentJson;
        this.touch();
    }

    set updatedBy(updatedBy: string) {
        this.props.updatedBy = updatedBy;
        this.touch();
    }

    private touch() {
        this.updatedAt = new Date();
    }
}
