import { IStorageProvider } from "../providers/storage.provider";
import { FilesRepository } from "../repositories/files.repository";

import { DomainEvents } from "@/domain/@shared/events/domain-events";
import { EventHandler } from "@/domain/@shared/events/event-handler";
import { UserDeletedEvent } from "@/domain/identity/enterprise/events/user-deleted.event";

export class OnUserDeletedSubscriber implements EventHandler {
    constructor(
        private filesRepository: FilesRepository,
        private storageProvider: IStorageProvider,
    ) {
        this.setupSubscriptions();
    }

    setupSubscriptions(): void {
        DomainEvents.register(this.deleteUserFiles.bind(this), UserDeletedEvent.name);
    }

    private async deleteUserFiles(event: UserDeletedEvent): Promise<void> {
        const userId = event.getAggregateId().toString();

        // Find all files associated with this user
        const files = await this.filesRepository.findByEntity("user", userId);

        // Delete each file from storage and database
        for (const file of files) {
            try {
                // Delete from cloud storage
                await this.storageProvider.delete(file.path.toString());
            } catch {
                // Log error but continue - file might already be deleted from storage
                console.error(`Failed to delete file from storage: ${file.path.toString()}`);
            }
        }

        // Delete all file records from database
        await this.filesRepository.deleteByEntity("user", userId);
    }
}
