// Fixed, tested 13x13 layouts. The server selects one mapId per match and
// every client renders the same layout from this catalog.
export const NETWORKER_MAPS = {
	classic: [
		'#############',
		'#     #     #',
		'# ### # ### #',
		'# #       # #',
		'# # ##### # #',
		'#   #   #   #',
		'### # # # ###',
		'#   #   #   #',
		'# # ##### # #',
		'# #       # #',
		'# ### # ### #',
		'#     #     #',
		'#############',
	],
	crossroads: [
		'#############',
		'#     #     #',
		'# ###   ### #',
		'# #       # #',
		'# # ##### # #',
		'#   #     # #',
		'### # ### # #',
		'# # #     # #',
		'# # ##### # #',
		'# #       # #',
		'# ###   ### #',
		'#     #     #',
		'#############',
	],
	zigzag: [
		'#############',
		'#   #       #',
		'# # # ##### #',
		'# # #       #',
		'# # ##### # #',
		'# #   #   # #',
		'# ### # # # #',
		'#   # # #   #',
		'# # # ##### #',
		'# # #       #',
		'# # ##### # #',
		'#       #   #',
		'#############',
	],
	loops: [
		'#############',
		'#     #     #',
		'# ### # ### #',
		'#   #   #   #',
		'### ##### ###',
		'#     #     #',
		'# ### # ### #',
		'# #   #   # #',
		'# # ####### #',
		'# #         #',
		'# ######### #',
		'#           #',
		'#############',
	],
	weave: [
		'#############',
		'#   #   #   #',
		'# # # # # # #',
		'# #     #   #',
		'# ##### ### #',
		'#     #     #',
		'# ### ##### #',
		'#   #     # #',
		'# # ### # # #',
		'# #   # #   #',
		'# ### # ### #',
		'#     #     #',
		'#############',
	],
} as const;

export type NetworkerMapId = keyof typeof NETWORKER_MAPS;
export const NETWORKER_MAP_IDS = Object.keys(NETWORKER_MAPS) as NetworkerMapId[];

export function getNetworkerMap(mapId: NetworkerMapId | null | undefined) {
	return NETWORKER_MAPS[mapId ?? 'classic'] ?? NETWORKER_MAPS.classic;
}

export const NETWORKER_MAP = NETWORKER_MAPS.classic;
export const NETWORKER_MAP_ROWS = NETWORKER_MAP.length;
export const NETWORKER_MAP_COLUMNS = NETWORKER_MAP[0].length;

export function isNetworkerWall(
	row: number,
	col: number,
	map: readonly string[] = NETWORKER_MAP,
) {
	return map[row]?.[col] === '#';
}

export function isNetworkerWalkable(
	row: number,
	col: number,
	map: readonly string[] = NETWORKER_MAP,
) {
	return map[row]?.[col] === ' ';
}

export const NETWORKER_PLAYER_START = { row: 1, col: 1 };

export const NETWORKER_SPAWN_POINTS = [
	{ row: 1, col: 1 },
	{ row: 1, col: NETWORKER_MAP_COLUMNS - 2 },
	{ row: NETWORKER_MAP_ROWS - 2, col: 1 },
	{ row: NETWORKER_MAP_ROWS - 2, col: NETWORKER_MAP_COLUMNS - 2 },
] as const;

export function getSpawnPoint(seat: number) {
	return NETWORKER_SPAWN_POINTS[seat % NETWORKER_SPAWN_POINTS.length];
}
