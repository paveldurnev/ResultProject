import React, { useRef, useState } from "react";
import { useSketch } from "../state/store";

const dotRadius = 2;

export const SketchCanvas: React.FC = () => {
	const { model, tool, addPoint, addSegment, setSelected, selected, movePoint, constraints } = useSketch();
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [pendingSegStart, setPendingSegStart] = useState<string | null>(null);
	const [dragPointId, setDragPointId] = useState<string | null>(null);
	const [dragSegId, setDragSegId] = useState<string | null>(null);
	const [dragLastWorld, setDragLastWorld] = useState<{ x: number; y: number } | null>(null);
	const [slideOnSegId, setSlideOnSegId] = useState<string | null>(null);

	const project = (clientX: number, clientY: number) => {
		const rect = svgRef.current!.getBoundingClientRect();
		const x = (clientX - rect.left) / rect.width;
		const y = (clientY - rect.top) / rect.height;
		const ux = x * 200 - 100;
		const uy = -(y * 200 - 100);
		return { x: ux, y: uy };
	};

	const nearestPointId = (x: number, y: number, thresh = 6): string | null => {
		let best: { id: string; d: number } | null = null;
		for (const p of model.points) {
			const d = Math.hypot(p.x - x, p.y - y);
			if (d <= thresh && (!best || d < best.d)) best = { id: p.id, d };
		}
		return best ? best.id : null;
	};

	const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

	// constraints helpers
	const isPointFixed = (pid: string): boolean =>
		constraints.some((c) => c.type === "fix_point" && c.refs[0] === pid);

	const slideSegmentForPoint = (pid: string): string | null => {
		const c = constraints.find((c) => c.type === "point_on_line" && c.refs[0] === pid);
		return c ? (c.refs[1] as string) : null;
	};

	const getSegmentById = (sid: string) => model.segments.find((s) => s.id === sid) || null;
	const getPointById = (pid: string) => model.points.find((p) => p.id === pid) || null;

	const coincidentPointsOf = (pid: string): string[] => {
		const ids: Set<string> = new Set([pid]);
		for (const c of constraints) {
			if (c.type !== "coincident") continue;
			const [a, b] = c.refs as [string, string];
			if (a === pid) ids.add(b);
			if (b === pid) ids.add(a);
		}
		return Array.from(ids);
	};

	const lineProjection = (px: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
		const ux = b.x - a.x;
		const uy = b.y - a.y;
		const vx = px.x - a.x;
		const vy = px.y - a.y;
		const uu = ux * ux + uy * uy || 1;
		const t = (vx * ux + vy * uy) / uu;
		return { x: a.x + ux * t, y: a.y + uy * t };
	};

	const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
		const coords = project(e.clientX, e.clientY);
		if (tool === "point") {
			const id = genId("p");
			addPoint({ id, x: coords.x, y: coords.y });
			setSelected({ kind: "point", id });
		} else if (tool === "segment") {
			const hit = nearestPointId(coords.x, coords.y);
			let startId = pendingSegStart;
			if (!startId) {
				// first click
				if (hit) {
					setPendingSegStart(hit);
					setSelected({ kind: "point", id: hit });
				} else {
					const id = genId("p");
					addPoint({ id, x: coords.x, y: coords.y });
					setPendingSegStart(id);
					setSelected({ kind: "point", id });
				}
			} else {
				let endId = hit;
				if (!endId) {
					endId = genId("p");
					addPoint({ id: endId, x: coords.x, y: coords.y });
				}
				if (endId !== startId) {
					const sid = genId("s");
					addSegment({ id: sid, p1: startId, p2: endId });
					setSelected({ kind: "segment", id: sid });
				}
				setPendingSegStart(null);
			}
		}
	};

	const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!dragPointId && !dragSegId) return;
		const world = project(e.clientX, e.clientY);

		if (dragPointId) {
			let target = world;
			const slideSeg = slideOnSegId;
			if (slideSeg) {
				const seg = getSegmentById(slideSeg);
				if (seg) {
					const a = getPointById(seg.p1)!;
					const b = getPointById(seg.p2)!;
					target = lineProjection(world, { x: a.x, y: a.y }, { x: b.x, y: b.y });
				}
			}
			const p = getPointById(dragPointId);
			if (!p) return;
			const dx = target.x - p.x;
			const dy = target.y - p.y;
			for (const id of coincidentPointsOf(dragPointId)) {
				const pt = getPointById(id);
				if (!pt) continue;
				movePoint(id, pt.x + dx, pt.y + dy);
			}
			return;
		}

		if (dragSegId && dragLastWorld) {
			const dx = world.x - dragLastWorld.x;
			const dy = world.y - dragLastWorld.y;
			const seg = getSegmentById(dragSegId);
			if (seg) {
				const endpoints = [seg.p1, seg.p2];
				for (const pid of endpoints) {
					for (const id of coincidentPointsOf(pid)) {
						const pt = getPointById(id);
						if (!pt) continue;
						movePoint(id, pt.x + dx, pt.y + dy);
					}
				}
			}
			setDragLastWorld(world);
		}
	};

	const onPointerUp = () => {
		if (dragPointId || dragSegId) {
			setDragPointId(null);
			setDragSegId(null);
			setSlideOnSegId(null);
			setDragLastWorld(null);
		}
	};

	return (
		<svg
			ref={svgRef}
			onClick={onSvgClick}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			width="100%"
			height="100%"
			viewBox="-100 -100 200 200"
			style={{ background: "#fff" }}
		>
			{/* grid */}
			<defs>
				<pattern id="minorGrid" width="10" height="10" patternUnits="userSpaceOnUse">
					<path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.2" />
				</pattern>
				<pattern id="majorGrid" width="50" height="50" patternUnits="userSpaceOnUse">
					<rect width="50" height="50" fill="url(#minorGrid)" />
					<path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d1d5db" strokeWidth="0.5" />
				</pattern>
			</defs>
			<rect x="-100" y="-100" width="200" height="200" fill="url(#majorGrid)" />

			{/* axes */}
			<line x1="-100" y1="0" x2="100" y2="0" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.5" />
			<line x1="0" y1="-100" x2="0" y2="100" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.5" />
			{/* segments */}
			{model.segments.map((s) => {
				const p1 = model.points.find((p) => p.id === s.p1);
				const p2 = model.points.find((p) => p.id === s.p2);
				if (!p1 || !p2) return null;
				const isSel = selected?.kind === "segment" && selected.id === s.id;
				return (
					<line
						key={s.id}
						x1={p1.x}
						y1={-p1.y}
						x2={p2.x}
						y2={-p2.y}
						stroke={isSel ? "#f59e0b" : "#111827"}
						strokeWidth={isSel ? 1.5 : 1}
						strokeLinecap="round"
						onPointerDown={(e) => {
							if (tool === "select") {
								e.stopPropagation();
								setSelected({ kind: "segment", id: s.id });
								// block whole-line drag if any endpoint is fixed
								const isFixed = isPointFixed(s.p1) || isPointFixed(s.p2);
								if (!isFixed) {
									setDragSegId(s.id);
									setDragLastWorld(project(e.clientX, e.clientY));
								}
							}
						}}
					/>
				);
			})}
			{/* points */}
			{model.points.map((p) => {
				const isSel = selected?.kind === "point" && selected.id === p.id;
				return (
					<circle
						key={p.id}
						cx={p.x}
						cy={-p.y}
						r={dotRadius}
						fill={isSel ? "#f59e0b" : "#1f2937"}
						stroke="#d1d5db"
						strokeWidth={isSel ? 0.8 : 0.6}
						onPointerDown={(e) => {
							if (tool === "select") {
								e.stopPropagation();
								setSelected({ kind: "point", id: p.id });
								// block drag if point is fixed
								if (isPointFixed(p.id)) return;
								setDragPointId(p.id);
								setDragLastWorld(project(e.clientX, e.clientY));
								// if point is constrained to a line, enable slide mode
								const slideSeg = slideSegmentForPoint(p.id);
								setSlideOnSegId(slideSeg);
							}
						}}
					/>
				);
			})}
		</svg>
	);
};


