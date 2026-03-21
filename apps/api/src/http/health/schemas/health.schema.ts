import { ApiProperty } from "@nestjs/swagger";

export class HealthOkResponseDTO {
    @ApiProperty({
        description: "Overall API status",
        enum: ["ok"],
        example: "ok",
    })
    status!: "ok";

    @ApiProperty({
        description: "Database connectivity status",
        enum: ["up"],
        example: "up",
    })
    db!: "up";
}

export class HealthDegradedResponseDTO {
    @ApiProperty({
        description: "Overall API status",
        enum: ["degraded"],
        example: "degraded",
    })
    status!: "degraded";

    @ApiProperty({
        description: "Database connectivity status",
        enum: ["down"],
        example: "down",
    })
    db!: "down";
}
