import React from "react";
import { useSketch } from "../state/store";
import { ArrowUpLeft, TrashIcon } from "lucide-react";

const SegmentIcon = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="2" fill="white"/>
		<circle cx="18" cy="6" r="2" stroke="currentColor" strokeWidth="2" fill="white"/>
		<line x1="7.4" y1="16.6" x2="16.6" y2="7.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
	</svg>
);

const PointIcon = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="currentColor" />
	</svg>
);


export const Toolbar: React.FC = () => {
	const { tool, selectTool, selected, deleteSelected } = useSketch();

	const buttons: { id: typeof tool; label: string; icon: React.FC }[] = [
		{ id: "select", label: "Select", icon: ArrowUpLeft },
		{ id: "point", label: "Point", icon: PointIcon },
		{ id: "segment", label: "Segment", icon: SegmentIcon }
	];

	return (
		<div className="flex w-full flex-col items-center gap-2">
			{buttons.map((b) => (
				<button
					key={b.id}
					onClick={() => selectTool(b.id)}
					title={b.label}
					className={`h-12 w-12 flex text-center justify-center items-center rounded-md border transition-colors ${tool === b.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
				>
					<b.icon />
				</button>
			))}
			<div className="my-2 h-px w-8 bg-gray-300" />
			<button
				onClick={() => deleteSelected()}
				title="Delete"
				disabled={!selected}
				className="h-12 w-12 flex text-center justify-center items-center rounded-md border border-gray-200 bg-white text-gray-700 transition-opacity hover:bg-gray-50 disabled:opacity-40"
			>
				<TrashIcon />
			</button>
		</div>
	);
};

