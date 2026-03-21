import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";

export class SpacePresenter {
    static toHTTP(space: SpaceEntity) {
        return {
            id: space.id.toString(),
            key: space.key,
            name: space.name,
            description: space.description,
            createdAt: space.createdAt.toISOString(),
            updatedAt: space.updatedAt.toISOString(),
        };
    }
}
