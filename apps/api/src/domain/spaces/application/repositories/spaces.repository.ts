import { SpaceEntity } from "../../enterprise/entities/space.entity";

export interface SpacesRepository {
    findById(id: string): Promise<SpaceEntity | null>;
    findByKey(key: string): Promise<SpaceEntity | null>;
    list(): Promise<SpaceEntity[]>;
    create(space: SpaceEntity): Promise<SpaceEntity>;
    update(space: SpaceEntity): Promise<SpaceEntity | null>;
    delete(spaceId: string): Promise<SpaceEntity | null>;
}
