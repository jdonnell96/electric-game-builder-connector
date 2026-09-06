import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const tilemapRead: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"list_layers">;
    root_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_info">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_tileset_info">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_used_cells">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_cell">;
    node_path: z.ZodString;
    coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_cells_in_region">;
    node_path: z.ZodString;
    min_coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
    max_coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"convert_coords">;
    node_path: z.ZodString;
    local_position: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>>;
    map_coords: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>], "action">>;
export declare const tilemapEdit: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"set_cell">;
    node_path: z.ZodString;
    coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
    source_id: z.ZodOptional<z.ZodNumber>;
    atlas_coords: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>>;
    alternative_tile: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"erase_cell">;
    node_path: z.ZodString;
    coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"clear_layer">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"set_cells_batch">;
    node_path: z.ZodString;
    cells: z.ZodArray<z.ZodObject<{
        coords: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>;
        source_id: z.ZodOptional<z.ZodNumber>;
        atlas_coords: z.ZodOptional<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>>;
        alternative_tile: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>], "action">>;
export declare const gridmapRead: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"list">;
    root_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_info">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_meshlib_info">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_used_cells">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_cell">;
    node_path: z.ZodString;
    coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_cells_by_item">;
    node_path: z.ZodString;
    item: z.ZodNumber;
}, z.core.$strip>], "action">>;
export declare const gridmapEdit: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"set_cell">;
    node_path: z.ZodString;
    coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodNumber;
    orientation: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"clear_cell">;
    node_path: z.ZodString;
    coords: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"clear">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"set_cells_batch">;
    node_path: z.ZodString;
    cells: z.ZodArray<z.ZodObject<{
        coords: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, z.core.$strip>;
        item: z.ZodNumber;
        orientation: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>], "action">>;
export declare const tilemapTools: AnyToolDefinition[];
//# sourceMappingURL=tilemap.d.ts.map