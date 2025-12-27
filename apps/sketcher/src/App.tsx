import React, { useEffect, useState } from "react";
import { SketchCanvas } from "./canvas/SketchCanvas";
import { useSketch } from "./state/store";
import { solve, type Constraint } from "@cad/solver";
import { Toolbar } from "./ui/Toolbar";
import { ConstraintsPanel } from "./ui/ConstraintsPanel";
import { ConstraintsList } from "./ui/ConstraintsList";

export const App: React.FC = () => {
	const { model, replaceModel, constraints, deleteSelected } = useSketch();

	// debounced solve on changes
	useEffect(() => {
		if (model.points.length === 0) return;
		const h = setTimeout(() => {
			const res = solve(model, constraints as Constraint[], { maxIterations: 200 });
			if (res.converged) replaceModel(res.model);
		}, 0);
		return () => clearTimeout(h);
	}, [model, constraints]);

	// delete via keyboard
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Delete") {
				deleteSelected();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [deleteSelected]);

	return (
		<div className="flex h-full flex-col bg-gray-50">
			<header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
				<div className="flex items-center gap-4">
					<h1 className="text-xl font-semibold text-gray-900">CAD Sketcher</h1>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">
				<aside className="flex w-16 flex-col items-center gap-2 border-r border-gray-200 bg-white py-4">
					<Toolbar />
				</aside>

				<main className="flex flex-1 flex-col">
					<div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
						<ConstraintsPanel />
					</div>
					<div className="relative flex-1 bg-gray-50">
						<SketchCanvas />
					</div>
				</main>

				<aside className="w-80 border-l border-gray-200 bg-white">
					<div className="flex h-full flex-col">
						<div className="border-b border-gray-200 px-4 py-3">
							<h2 className="text-sm font-semibold text-gray-900">Constraints</h2>
						</div>
						<div className="flex-1 overflow-y-auto p-4">
							<ConstraintsList />
						</div>
						<div className="border-t border-gray-200 p-4">
							{/* placeholder for future actions */}
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
};


