import type { DocumentContent } from "@emerald/contracts";

import { Entity } from "@/domain/@shared/entities/entity.entity";

export interface DocumentRevisionProps {
    documentId: string;
    revisionNumber: number;
    contentJson: DocumentContent;
    createdBy: string;
    changeNote?: string | null;
}

export class DocumentRevisionEntity extends Entity<DocumentRevisionProps> {
    private constructor(props: DocumentRevisionProps, id?: string) {
        super(props, id);
    }

    static create(props: DocumentRevisionProps, id?: string) {
        return new DocumentRevisionEntity(props, id);
    }

    get documentId() {
        return this.props.documentId;
    }

    get revisionNumber() {
        return this.props.revisionNumber;
    }

    get contentJson() {
        return this.props.contentJson;
    }

    get createdBy() {
        return this.props.createdBy;
    }

    get changeNote() {
        return this.props.changeNote ?? null;
    }
}
