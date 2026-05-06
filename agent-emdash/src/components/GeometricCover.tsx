import { useMemo } from "react";

interface GeometricCoverProps {
	title: string;
	width?: number;
	height?: number;
	className?: string;
}

function hashTitle(title: string): number {
	let hash = 0;
	for (let i = 0; i < title.length; i++) {
		hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
	}
	return hash;
}

function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 0xffffffff;
	};
}

function HexPattern({ seed, width, height }: { seed: number; width: number; height: number }) {
	const rand = seededRandom(seed);
	const hexSize = 28;
	const cols = Math.ceil(width / (hexSize * 1.7)) + 1;
	const rows = Math.ceil(height / (hexSize * 1.5)) + 1;
	const hexagons: React.ReactElement[] = [];

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const x = col * hexSize * 1.73 + (row % 2 === 0 ? 0 : hexSize * 0.86);
			const y = row * hexSize * 1.5;
			const opacity = rand() * 0.18 + 0.03;
			const points = Array.from({ length: 6 }, (_, i) => {
				const angle = (Math.PI / 180) * (60 * i - 30);
				return `${x + hexSize * Math.cos(angle)},${y + hexSize * Math.sin(angle)}`;
			}).join(" ");
			hexagons.push(
				<polygon key={`${row}-${col}`} points={points} fill="none" stroke="#39ff14" strokeWidth="0.5" opacity={opacity} />
			);
		}
	}
	return <g>{hexagons}</g>;
}

function CircuitPattern({ seed, width, height }: { seed: number; width: number; height: number }) {
	const rand = seededRandom(seed);
	const lines: React.ReactElement[] = [];
	const count = 18;

	for (let i = 0; i < count; i++) {
		const x1 = rand() * width;
		const y1 = rand() * height;
		const dx = (rand() - 0.5) * 200;
		const dy = (rand() - 0.5) * 200;
		const x2 = x1 + dx;
		const y2 = y1 + dy;
		const opacity = rand() * 0.3 + 0.05;
		lines.push(
			<line key={`l-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#39ff14" strokeWidth="0.8" opacity={opacity} />
		);
		if (rand() > 0.5) {
			lines.push(
				<circle key={`c-${i}`} cx={x2} cy={y2} r={2 + rand() * 3} fill="#39ff14" opacity={opacity * 0.8} />
			);
		}
	}
	return <g>{lines}</g>;
}

function WavesPattern({ seed, width, height }: { seed: number; width: number; height: number }) {
	const rand = seededRandom(seed);
	const paths: React.ReactElement[] = [];
	const waveCount = 12;

	for (let i = 0; i < waveCount; i++) {
		const yBase = (i / waveCount) * height;
		const amplitude = rand() * 30 + 10;
		const freq = rand() * 0.02 + 0.005;
		const phase = rand() * Math.PI * 2;
		const points = Array.from({ length: 100 }, (_, j) => {
			const x = (j / 99) * width;
			const y = yBase + Math.sin(x * freq + phase) * amplitude;
			return `${j === 0 ? "M" : "L"} ${x} ${y}`;
		}).join(" ");
		const opacity = rand() * 0.15 + 0.03;
		paths.push(
			<path key={`w-${i}`} d={points} fill="none" stroke="#39ff14" strokeWidth="0.6" opacity={opacity} />
		);
	}
	return <g>{paths}</g>;
}

function GradientMeshPattern({ seed, width, height }: { seed: number; width: number; height: number }) {
	const rand = seededRandom(seed);
	const rects: React.ReactElement[] = [];
	const cols = 8;
	const rows = 6;
	const cellW = width / cols;
	const cellH = height / rows;

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const opacity = rand() * 0.12 + 0.01;
			const green = Math.floor(rand() * 255);
			rects.push(
				<rect
					key={`${row}-${col}`}
					x={col * cellW}
					y={row * cellH}
					width={cellW}
					height={cellH}
					fill={`rgba(57, ${green}, 20, ${opacity})`}
				/>
			);
		}
	}
	return <g>{rects}</g>;
}

const PATTERNS = [HexPattern, CircuitPattern, WavesPattern, GradientMeshPattern];

export function GeometricCover({ title, width = 800, height = 500, className }: GeometricCoverProps) {
	const { seed, words, patternIndex, circles } = useMemo(() => {
		const words = title
			.split(/\s+/)
			.slice(0, 4)
			.join(" ")
			.toUpperCase();
		const seed = hashTitle(title);
		const rand = seededRandom(seed);
		const patternIndex = seed % 4;

		const circles = Array.from({ length: 3 }, (_, i) => ({
			cx: rand() * width,
			cy: rand() * height,
			r: rand() * 200 + 100,
			opacity: rand() * 0.12 + 0.04,
			id: `grad-${i}`,
		}));

		return { seed, words, patternIndex, circles };
	}, [title, width, height]);

	const PatternComponent = PATTERNS[patternIndex];

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			className={className}
			style={{ display: "block", background: "#000" }}
			aria-label={title}
		>
			<defs>
				{circles.map((c) => (
					<radialGradient key={c.id} id={c.id} cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="#39ff14" stopOpacity={c.opacity * 2} />
						<stop offset="100%" stopColor="#39ff14" stopOpacity="0" />
					</radialGradient>
				))}
			</defs>

			{/* Base black background */}
			<rect width={width} height={height} fill="#000000" />

			{/* Geometric pattern */}
			<PatternComponent seed={seed} width={width} height={height} />

			{/* Neon glow circles */}
			{circles.map((c) => (
				<ellipse key={c.id} cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.7} fill={`url(#${c.id})`} />
			))}

			{/* Title words overlay */}
			<text
				x={width - 24}
				y={height - 24}
				textAnchor="end"
				dominantBaseline="auto"
				fontFamily="'JetBrains Mono', monospace"
				fontSize="13"
				fontWeight="500"
				letterSpacing="0.08em"
				fill="#39ff14"
				opacity="0.55"
			>
				{words}
			</text>
		</svg>
	);
}
