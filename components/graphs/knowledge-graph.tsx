"use client";

import * as React from "react";
import {
  drag,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  select,
  type Selection,
  type SimulationLinkDatum,
} from "d3";
import { useThemeColors } from "@/hooks/use-theme";

export type GraphNode = {
  id: string;
  label: string;
  kind: string;
  importance: number;
  color?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  weight: number;
};

type SimNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
};

const KIND_COLORS: Record<string, string> = {
  concept: "chart2",
  fact: "chart3",
  lesson: "chart4",
  playbook: "chart5",
  person: "chart6",
};

/**
 * Force-directed knowledge graph (d3-force + d3-selection + d3-drag).
 * Static simulation with drag support — no canvas libs.
 */
export function KnowledgeGraph({
  nodes,
  edges,
  height = 460,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
  onSelect?: (node: GraphNode) => void;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const c = useThemeColors();

  React.useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    const width = wrap.clientWidth;

    const simNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * width * 0.4,
      y: height / 2 + (Math.random() - 0.5) * height * 0.4,
      vx: 0,
      vy: 0,
    }));
    const idToNode = new Map(simNodes.map((n) => [n.id, n]));
    const simEdges: SimulationLinkDatum<SimNode>[] = edges
      .filter((e) => idToNode.has(e.source) && idToNode.has(e.target))
      .map((e) => ({
        source: idToNode.get(e.source) as SimNode,
        target: idToNode.get(e.target) as SimNode,
        weight: e.weight,
      }));

    const sim = forceSimulation(simNodes)
      .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(simEdges).id((d) => d.id).distance(90).strength(0.4))
      .force("charge", forceManyBody().strength(-420))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide<SimNode>().radius((d) => d.importance * 14 + 22))
      .force("x", forceX(width / 2).strength(0.03))
      .force("y", forceY(height / 2).strength(0.03));

    let linkSel: Selection<SVGLineElement, SimulationLinkDatum<SimNode>, SVGGElement, unknown> | null = null;
    let nodeSel: Selection<SVGGElement, SimNode, SVGGElement, unknown> | null = null;
    let labelSel: Selection<SVGTextElement, SimNode, SVGGElement, unknown> | null = null;

    sim.on("tick", () => {
      if (linkSel) {
        linkSel
          .attr("x1", (d) => (d.source as SimNode).x)
          .attr("y1", (d) => (d.source as SimNode).y)
          .attr("x2", (d) => (d.target as SimNode).x)
          .attr("y2", (d) => (d.target as SimNode).y);
      }
      nodeSel?.attr("transform", (d) => `translate(${d.x},${d.y})`);
      labelSel?.attr("transform", (d) => `translate(${d.x},${d.y + 26})`);
    });

    const radius = (d: SimNode) => 6 + d.importance * 9;
    const color = (d: SimNode) => {
      const key = KIND_COLORS[d.kind] ?? "chart1";
      return c[key] ?? c.chart1;
    };

    svg.innerHTML = "";
    const g = select(svg).append("g");

    linkSel = g
      .append("g")
      .selectAll<SVGLineElement, SimulationLinkDatum<SimNode>>("line")
      .data(simEdges)
      .join("line")
      .attr("stroke", c.line)
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.7);

    nodeSel = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .on("click", (ev, d) => {
        setSelected(d.id);
        onSelect?.(d);
      })
      .on("mouseenter", (ev, _d) => {
        ev.currentTarget.style.cursor = "pointer";
        ev.currentTarget.querySelector("circle")?.setAttribute("stroke", "#ffffffaa");
      })
      .on("mouseleave", (ev) => {
        ev.currentTarget.querySelector("circle")?.setAttribute("stroke", "transparent");
      });

    nodeSel
      .call(
        drag<SVGGElement, SimNode>()
          .on("start", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (ev, d) => {
            d.fx = ev.x;
            d.fy = ev.y;
          })
          .on("end", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    nodeSel
      .on("click", (ev, d) => {
        setSelected(d.id);
        onSelect?.(d);
      })
      .append("circle")
      .attr("r", radius)
      .attr("fill", color)
      .attr("stroke", "transparent")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9)
      .attr("filter", "url(#graph-glow)");

    labelSel = g
      .append("g")
      .selectAll<SVGTextElement, SimNode>("text")
      .data(simNodes)
      .join("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("fill", c.mut)
      .attr("font-size", 10)
      .attr("font-family", "var(--font-sans)");

    return () => {
      sim.stop();
    };
  }, [nodes, edges, height, c, onSelect]);

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-xl">
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block">
        <defs>
          <filter id="graph-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      {selected ? (
        <div className="absolute right-3 top-3 rounded-lg border border-line-strong bg-panel/90 px-3 py-2 text-xs backdrop-blur">
          {nodes.find((n) => n.id === selected)?.label}
        </div>
      ) : null}
    </div>
  );
}