import React from "react";
import { useSketch } from "../state/store";
import type { Constraint, ConstraintType } from "@cad/solver";
import { XIcon } from "lucide-react";
import { radToDeg, degToRad } from "../lib/units";

const friendly: Record<ConstraintType, string> = {
	coincident: "Coincident points",
	distance: "Distance",
	fix_point: "Fix point",
	parallel: "Parallel",
	perpendicular: "Perpendicular",
	vertical: "Vertical",
	horizontal: "Horizontal",
	angle: "Angle",
	point_on_line: "Point on line"
};

export const ConstraintsList: React.FC = () => {
	const { constraints, removeConstraint, updateConstraint } = useSketch();

	return (
		<div className="space-y-3">
			{constraints.map((c, index) => (
				<div
					key={c.id}
					className="group rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="flex-1">
							<div className="mb-1 flex items-center gap-2">
								<span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-700">
									{index + 1}
								</span>
								<span className="text-sm font-medium text-gray-900">{friendly[c.type]}</span>
							</div>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span className="text-xs text-gray-500">refs:</span>
								{c.refs.map((ref) => (
									<span key={ref} className="inline-flex h-6 items-center rounded border border-gray-200 px-2 text-xs font-mono text-gray-700">
										{ref}
									</span>
								))}
								{c.type === "distance" && (
									<input
										type="number"
										step="1"
										className="ml-2 h-6 w-20 rounded border border-gray-300 px-2 text-xs font-mono"
										value={c.params?.distance ?? 0}
										onChange={(e) =>
											updateConstraint(c.id, (old) => ({
												...old,
												params: { ...old.params, distance: Number(e.target.value) }
											}))
										}
									/>
								)}
								{c.type === "angle" && (
									<input
										type="number"
										step="0.1"
										className="ml-2 h-6 w-24 rounded border border-gray-300 px-2 text-xs font-mono"
										value={radToDeg(c.params?.angle ?? 0)}
										onChange={(e) =>
											updateConstraint(c.id, (old) => ({
												...old,
												params: { ...old.params, angle: degToRad(Number(e.target.value)) }
											}))
										}
									/>
								)}
							</div>
						</div>
						<button
							className="h-8 w-8 rounded-md text-gray-500 opacity-0 transition-opacity hover:bg-gray-50 group-hover:opacity-100"
							onClick={() => removeConstraint(c.id)}
							title="Delete"
						>
							<XIcon />
						</button>
					</div>
				</div>
			))}
			{constraints.length === 0 && <div className="text-sm text-gray-500">No constraints</div>}
		</div>
	);
};


