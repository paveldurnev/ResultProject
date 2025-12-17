import React, { useMemo, useState } from "react";
import { useSketch } from "../state/store";
import type { Constraint, ConstraintType } from "@cad/solver";
import { degToRad } from "../lib/units";

type ParamKey = "distance" | "angle";

const typeToRefs: Record<ConstraintType, number> = {
	coincident: 2,
	distance: 2,
	fix_point: 1,
	parallel: 2,
	perpendicular: 2,
	vertical: 1,
	horizontal: 1,
	angle: 2,
	point_on_line: 2
};

const needsParam: Partial<Record<ConstraintType, ParamKey>> = {
	distance: "distance",
	angle: "angle"
};

	export const ConstraintsPanel: React.FC = () => {
	const { selected, addConstraint, constraints, removeConstraint } = useSketch();
	const [ctype, setCtype] = useState<ConstraintType>("distance");
	const [refs, setRefs] = useState<string[]>([]);
	const [distance, setDistance] = useState<number>(50);
	const [angle, setAngle] = useState<number>(90);

	const required = typeToRefs[ctype];
	const canAdd = refs.length >= required;

	const friendly: Record<ConstraintType, string> = {
		coincident: "Coincident Points",
		distance: "Distance",
		fix_point: "Fix Point",
		parallel: "Parallel",
		perpendicular: "Perpendicular",
		vertical: "Vertical",
		horizontal: "Horizontal",
		angle: "Angle",
		point_on_line: "Point on Line"
	};

	const useSelected = () => {
		if (!selected) return;
		setRefs((r) => {
			if (r.includes(selected.id)) return r;
			return [...r, selected.id].slice(0, required);
		});
	};

	const clearRefs = () => setRefs([]);

	const onAdd = () => {
		if (!canAdd) return;
		const id = `c_${Math.random().toString(36).slice(2, 8)}`;
		const params: Constraint["params"] | undefined =
			needsParam[ctype] === "distance"
				? { distance }
				: needsParam[ctype] === "angle"
				? { angle: degToRad(angle) }
				: undefined;
		const c: Constraint = { id, type: ctype, refs: refs.slice(0, required), params };
		addConstraint(c);
		clearRefs();
	};

	return (
		<div className="flex items-center gap-3 flex-wrap w-full">
			<select className="border border-gray-300 rounded px-2 py-1 h-8" value={ctype} onChange={(e) => { setCtype(e.target.value as ConstraintType); clearRefs(); }}>
				{(Object.keys(typeToRefs) as ConstraintType[]).map((t) => (
					<option key={t} value={t}>{friendly[t]}</option>
				))}
			</select>
			<button className="h-8 px-3 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50" onClick={useSelected} disabled={!selected}>Add selected</button>
			<button className="h-8 px-3 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50" onClick={clearRefs} disabled={refs.length === 0}>Clear</button>
			<div className="flex items-center gap-2">
				<span className="text-sm text-gray-600">Refs:</span>
				<span className="text-sm font-mono text-gray-700">{refs.join(", ") || "-"}</span>
			</div>
			{needsParam[ctype] === "distance" && (
				<label className="inline-flex items-center gap-2">
					<span className="text-sm text-gray-600">d</span>
					<input className="border border-gray-300 rounded px-2 h-8 w-24 font-mono"
						type="number"
						step="1"
						value={distance}
						onChange={(e) => setDistance(Number(e.target.value))}
					/>
				</label>
			)}
			{needsParam[ctype] === "angle" && (
				<label className="inline-flex items-center gap-2">
					<span className="text-sm text-gray-600">angle (deg)</span>
					<input className="border border-gray-300 rounded px-2 h-8 w-28 font-mono"
						type="number"
						step="0.1"
						value={angle}
						onChange={(e) => setAngle(Number(e.target.value))}
					/>
				</label>
			)}
			<button className="h-8 px-3 rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50" onClick={onAdd} disabled={!canAdd}>Add</button>
		</div>
	);
};


