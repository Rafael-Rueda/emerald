import { AggregateRoot } from "@/domain/@shared/entities/aggregate-root.entity";

export interface SpaceProps {
    key: string;
    name: string;
    description: string;
}

export class SpaceEntity extends AggregateRoot<SpaceProps> {
    private constructor(props: SpaceProps, id?: string) {
        super(props, id);
    }

    static create(props: SpaceProps, id?: string) {
        return new SpaceEntity(props, id);
    }

    get key() {
        return this.props.key;
    }

    get name() {
        return this.props.name;
    }

    get description() {
        return this.props.description;
    }

    set key(key: string) {
        this.props.key = key;
        this.touch();
    }

    set name(name: string) {
        this.props.name = name;
        this.touch();
    }

    set description(description: string) {
        this.props.description = description;
        this.touch();
    }

    private touch() {
        this.updatedAt = new Date();
    }
}
