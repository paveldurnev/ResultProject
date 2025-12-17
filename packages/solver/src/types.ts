export type Id = string;

export type Point = {
	x: number;
	y: number;
	fixed?: boolean;
	id: Id;
};

export type Segment = {
	id: Id;
	p1: Id;
	p2: Id;
};

export type ConstraintType =
	| "coincident"
	| "distance"
	| "fix_point"
	| "parallel"
	| "perpendicular"
	| "vertical"
	| "horizontal"
	| "angle"
	| "point_on_line";

export type Constraint = {
	id: Id;
	type: ConstraintType;
	refs: Id[];
	params?: {
		distance?: number;
		x?: number;
		y?: number;
		angle?: number;
	};
	weight?: number;
};

export type Model = {
	points: Point[];
	segments: Segment[];
};

export type VariablePacking = {
	pointIndexById: Map<Id, number>;
	toVector: (model: Model) => Float64Array;
	fromVector: (model: Model, x: Float64Array) => Model;
};


