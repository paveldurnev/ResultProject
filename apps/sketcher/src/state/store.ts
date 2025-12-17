import { create } from "zustand";
import type { Model, Point, Segment, Constraint } from "@cad/solver";

export type Tool = "select" | "point" | "segment";

export type SketchState = {
	model: Model;
	constraints: Constraint[];
	tool: Tool;
	selected: { kind: "point" | "segment"; id: string } | null;
	selectTool: (t: Tool) => void;
	addPoint: (p: Point) => void;
	addSegment: (s: Segment) => void;
	removePoint: (id: string) => void;
	removeSegment: (id: string) => void;
	setConstraints: (c: Constraint[]) => void;
	replaceModel: (m: Model) => void;
	setSelected: (sel: { kind: "point" | "segment"; id: string } | null) => void;
	deleteSelected: () => void;
	addConstraint: (c: Constraint) => void;
	removeConstraint: (id: string) => void;
	movePoint: (id: string, x: number, y: number) => void;
	updateConstraint: (id: string, updater: (c: Constraint) => Constraint) => void;
};

export const useSketch = create<SketchState>((set) => ({
	model: { points: [], segments: [] },
	constraints: [],
	tool: "select",
	selected: null,
	selectTool: (t) => set({ tool: t }),
	addPoint: (p) => set((s) => ({ model: { ...s.model, points: [...s.model.points, p] } })),
	addSegment: (seg) => set((s) => ({ model: { ...s.model, segments: [...s.model.segments, seg] } })),
	removePoint: (id) =>
		set((s) => ({
			model: {
				...s.model,
				points: s.model.points.filter((p) => p.id !== id),
				segments: s.model.segments.filter((seg) => seg.p1 !== id && seg.p2 !== id)
			}
		})),
	removeSegment: (id) =>
		set((s) => ({ model: { ...s.model, segments: s.model.segments.filter((p) => p.id !== id) } })),
	setConstraints: (c) => set({ constraints: c }),
	replaceModel: (m) => set({ model: m }),
	setSelected: (sel) => set({ selected: sel }),
	deleteSelected: () =>
		set((s) => {
			if (!s.selected) return s;
			if (s.selected.kind === "point") {
				return {
					...s,
					selected: null,
					model: {
						...s.model,
						points: s.model.points.filter((p) => p.id !== s.selected!.id),
						segments: s.model.segments.filter(
							(seg) => seg.p1 !== s.selected!.id && seg.p2 !== s.selected!.id
						)
					}
				};
			}
			return {
				...s,
				selected: null,
				model: { ...s.model, segments: s.model.segments.filter((seg) => seg.id !== s.selected!.id) }
			};
		}),
	addConstraint: (c) => set((s) => ({ constraints: [...s.constraints, c] })),
	removeConstraint: (id) => set((s) => ({ constraints: s.constraints.filter((c) => c.id !== id) })),
	updateConstraint: (id, updater) =>
		set((s) => ({ constraints: s.constraints.map((c) => (c.id === id ? updater(c) : c)) })),
	movePoint: (id, x, y) =>
		set((s) => ({
			model: {
				...s.model,
				points: s.model.points.map((p) => (p.id === id ? { ...p, x, y } : p))
			}
		}))
}));


