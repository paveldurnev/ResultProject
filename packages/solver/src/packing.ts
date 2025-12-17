import type { Id, Model, VariablePacking } from "./types";

export function createPacking(model: Model): VariablePacking {
	const pointIndexById: Map<Id, number> = new Map();
	model.points.forEach((p, i) => {
		pointIndexById.set(p.id, i);
	});

	const toVector = (m: Model): Float64Array => {
		const vec: Float64Array = new Float64Array(m.points.length * 2);
		m.points.forEach((p, i) => {
			vec[i * 2 + 0] = p.x;
			vec[i * 2 + 1] = p.y;
		});
		return vec;
	};

	const fromVector = (m: Model, x: Float64Array): Model => {
		const points = m.points.map((p, i) => {
			const idx0 = i * 2 + 0;
			const idx1 = i * 2 + 1;
			const xv0: number = Number(idx0 < x.length ? x[idx0] : p.x);
			const xv1: number = Number(idx1 < x.length ? x[idx1] : p.y);
			return {
				...p,
				x: xv0,
				y: xv1
			};
		});
		return { ...m, points };
	};

	return { pointIndexById, toVector, fromVector };
}


