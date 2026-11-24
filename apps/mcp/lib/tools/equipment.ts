import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { addEquipment, EQUIPMENT_CATEGORIES, equipmentStats, listEquipment, updateEquipment } from "@golf/db";
import { date, id, run } from "./util";

const fields = {
  category: z.enum(EQUIPMENT_CATEGORIES),
  label: z.string().min(1).describe("Short name, e.g. '7 iron', 'Driver', 'Pro V1'"),
  brand: z.string().optional(), model: z.string().optional(),
  loft: z.number().min(0).max(80).optional(), shaft: z.string().optional(),
  acquired_on: date.optional(), notes: z.string().max(1000).optional(),
};

export function registerEquipmentTools(server: McpServer, userId: string) {
  server.registerTool("add_equipment", {
    title: "Add equipment",
    description: "Add a club, ball, or other gear to the golfer's equipment.",
    inputSchema: z.object(fields),
  }, (args) => run(() => addEquipment(userId, args)));

  server.registerTool("list_equipment", {
    title: "List equipment",
    description: "The golfer's equipment (current bag by default).",
    inputSchema: z.object({ include_retired: z.boolean().default(false) }),
    annotations: { readOnlyHint: true },
  }, ({ include_retired }) => run(() => listEquipment(userId, include_retired)));

  server.registerTool("update_equipment", {
    title: "Update equipment",
    description: "Change equipment details. Set retired_on to take it out of the bag.",
    inputSchema: z.object({
      equipment_id: id,
      category: fields.category.optional(), label: fields.label.optional(), brand: z.string().optional(), model: z.string().optional(),
      loft: z.number().min(0).max(80).optional(), shaft: z.string().optional(), acquired_on: date.optional(),
      retired_on: date.optional(), notes: z.string().max(1000).optional(),
    }),
  }, ({ equipment_id, ...patch }) => run(() => updateEquipment(userId, equipment_id, patch)));

  server.registerTool("get_equipment_stats", {
    title: "Equipment stats",
    description: "Usage per item: rounds in the bag, shots hit, average and longest distance.",
    inputSchema: z.object({ equipment_id: id.optional() }),
    annotations: { readOnlyHint: true },
  }, ({ equipment_id }) => run(() => equipmentStats(userId, equipment_id)));
}
