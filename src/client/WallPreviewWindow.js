import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { snapToGrid, snapToAngle, calculateWallProperties, isNearGridPoint, Point } from './utils/wallUtils';
const WallPreviewWindow = ({ onConfirm, onCancel, gridSize = 20, wallThickness = 4, snapToGrid: enableGridSnap = true, snapToAngles: enableAngleSnap = true, }) => {
    const [walls, setWalls] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [wallStart, setWallStart] = useState(null);
    const [wallCurrent, setWallCurrent] = useState(null);
    const [wallSnapPoint, setWallSnapPoint] = useState(null);
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    // Preview window dimensions
    const previewWidth = 600;
    const previewHeight = 400;
    const viewBox = `0 0 ${previewWidth} ${previewHeight}`;
    // Convert screen coordinates to SVG coordinates
    const screenToSvg = useCallback((clientX, clientY) => {
        if (!svgRef.current)
            return null;
        const rect = svgRef.current.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * previewWidth;
        const y = ((clientY - rect.top) / rect.height) * previewHeight;
        return { x, y };
    }, [previewWidth, previewHeight]);
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0)
            return;
        const svgCoords = screenToSvg(e.clientX, e.clientY);
        if (svgCoords) {
            setIsDrawing(true);
            const snappedStart = snapToGrid(svgCoords.x, svgCoords.y, gridSize, enableGridSnap);
            setWallStart(snappedStart);
            setWallCurrent(snappedStart);
            setWallSnapPoint(null);
            e.preventDefault();
        }
    }, [screenToSvg, gridSize, enableGridSnap]);
    const handleMouseMove = useCallback((e) => {
        if (isDrawing && wallStart) {
            const svgCoords = screenToSvg(e.clientX, e.clientY);
            if (svgCoords) {
                let snapped = snapToGrid(svgCoords.x, svgCoords.y, gridSize, enableGridSnap);
                snapped = snapToAngle(wallStart.x, wallStart.y, snapped.x, snapped.y, enableAngleSnap);
                setWallCurrent(snapped);
                if (isNearGridPoint(snapped.x, snapped.y, gridSize)) {
                    setWallSnapPoint(snapped);
                }
                else {
                    setWallSnapPoint(null);
                }
            }
        }
    }, [isDrawing, wallStart, screenToSvg, gridSize, enableGridSnap, enableAngleSnap]);
    const handleMouseUp = useCallback((e) => {
        if (isDrawing && wallStart && wallCurrent) {
            const svgCoords = screenToSvg(e.clientX, e.clientY);
            if (svgCoords) {
                let finalPoint = snapToGrid(svgCoords.x, svgCoords.y, gridSize, enableGridSnap);
                finalPoint = snapToAngle(wallStart.x, wallStart.y, finalPoint.x, finalPoint.y, enableAngleSnap);
                const { length, angle } = calculateWallProperties(wallStart.x, wallStart.y, finalPoint.x, finalPoint.y);
                const newWall = {
                    id: `wall-${Date.now()}`,
                    x1: wallStart.x,
                    y1: wallStart.y,
                    x2: finalPoint.x,
                    y2: finalPoint.y,
                    thickness: wallThickness,
                    length: length,
                    angle: angle,
                    color: '#2c3e50',
                    snapToGrid: enableGridSnap,
                    gridSize: gridSize,
                };
                setWalls(prev => [...prev, newWall]);
            }
            setIsDrawing(false);
            setWallStart(null);
            setWallCurrent(null);
            setWallSnapPoint(null);
        }
    }, [isDrawing, wallStart, wallCurrent, screenToSvg, gridSize, enableGridSnap, enableAngleSnap, wallThickness]);
    // Draw walls on SVG
    useEffect(() => {
        if (!svgRef.current)
            return;
        const svg = svgRef.current;
        svg.innerHTML = '';
        // Draw grid background
        const gridSizePx = gridSize;
        for (let x = 0; x < previewWidth; x += gridSizePx) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', x.toString());
            line.setAttribute('y1', '0');
            line.setAttribute('x2', x.toString());
            line.setAttribute('y2', previewHeight.toString());
            line.setAttribute('stroke', '#e0e0e0');
            line.setAttribute('stroke-width', '0.5');
            svg.appendChild(line);
        }
        for (let y = 0; y < previewHeight; y += gridSizePx) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', '0');
            line.setAttribute('y1', y.toString());
            line.setAttribute('x2', previewWidth.toString());
            line.setAttribute('y2', y.toString());
            line.setAttribute('stroke', '#e0e0e0');
            line.setAttribute('stroke-width', '0.5');
            svg.appendChild(line);
        }
        // Draw existing walls
        walls.forEach(wall => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', wall.x1.toString());
            line.setAttribute('y1', wall.y1.toString());
            line.setAttribute('x2', wall.x2.toString());
            line.setAttribute('y2', wall.y2.toString());
            line.setAttribute('stroke', wall.color);
            line.setAttribute('stroke-width', wall.thickness.toString());
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
            // Draw measurement label
            const midX = (wall.x1 + wall.x2) / 2;
            const midY = (wall.y1 + wall.y2) / 2;
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', midX.toString());
            text.setAttribute('y', (midY - 10).toString());
            text.setAttribute('fill', '#666666');
            text.setAttribute('font-size', '12');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = `${wall.length.toFixed(2)}m`;
            svg.appendChild(text);
        });
        // Draw preview wall while drawing
        if (isDrawing && wallStart && wallCurrent) {
            const previewLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            previewLine.setAttribute('x1', wallStart.x.toString());
            previewLine.setAttribute('y1', wallStart.y.toString());
            previewLine.setAttribute('x2', wallCurrent.x.toString());
            previewLine.setAttribute('y2', wallCurrent.y.toString());
            previewLine.setAttribute('stroke', '#3498db');
            previewLine.setAttribute('stroke-width', wallThickness.toString());
            previewLine.setAttribute('stroke-linecap', 'round');
            previewLine.setAttribute('stroke-dasharray', '5,5');
            previewLine.setAttribute('opacity', '0.7');
            svg.appendChild(previewLine);
            // Draw snap point highlight
            if (wallSnapPoint) {
                const snapCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                snapCircle.setAttribute('cx', wallSnapPoint.x.toString());
                snapCircle.setAttribute('cy', wallSnapPoint.y.toString());
                snapCircle.setAttribute('r', '5');
                snapCircle.setAttribute('fill', '#3498db');
                snapCircle.setAttribute('opacity', '0.8');
                svg.appendChild(snapCircle);
            }
            // Draw measurement preview
            const { length, angle } = calculateWallProperties(wallStart.x, wallStart.y, wallCurrent.x, wallCurrent.y);
            const midX = (wallStart.x + wallCurrent.x) / 2;
            const midY = (wallStart.y + wallCurrent.y) / 2;
            const previewText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            previewText.setAttribute('x', midX.toString());
            previewText.setAttribute('y', (midY - 10).toString());
            previewText.setAttribute('fill', '#3498db');
            previewText.setAttribute('font-size', '12');
            previewText.setAttribute('text-anchor', 'middle');
            previewText.setAttribute('font-weight', 'bold');
            previewText.textContent = `${length.toFixed(2)}m (${angle.toFixed(0)}°)`;
            svg.appendChild(previewText);
        }
    }, [walls, isDrawing, wallStart, wallCurrent, wallSnapPoint, gridSize, wallThickness, previewWidth, previewHeight]);
    const handleConfirm = () => {
        onConfirm(walls);
    };
    const handleCancel = () => {
        onCancel();
    };
    const handleClear = () => {
        setWalls([]);
    };
    return (_jsxs("div", { ref: containerRef, style: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            maxHeight: '90vh',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            border: '1px solid #e0e0e0',
            zIndex: 10005,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
        }, children: [_jsxs("div", { style: {
                    padding: '20px 24px',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }, children: [_jsx("h2", { style: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#333333' }, children: "Wall Maker Preview" }), _jsx("button", { onClick: handleCancel, style: {
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#999999',
                            padding: '0',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: "\u00D7" })] }), _jsx("div", { style: {
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#f8f8f8',
                }, children: _jsx("svg", { ref: svgRef, width: previewWidth, height: previewHeight, viewBox: viewBox, style: {
                        background: '#ffffff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        cursor: isDrawing ? 'crosshair' : 'crosshair',
                    }, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: handleMouseUp }) }), _jsxs("div", { style: { padding: '16px 24px', borderTop: '1px solid #e0e0e0' }, children: [_jsx("p", { style: { margin: '0 0 12px 0', fontSize: '13px', color: '#666666' }, children: "Click and drag to draw walls. Walls will snap to grid and angles." }), _jsx("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: _jsxs("span", { style: { fontSize: '12px', color: '#999999' }, children: ["Walls: ", walls.length] }) })] }), _jsxs("div", { style: {
                    padding: '16px 24px',
                    borderTop: '1px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                }, children: [_jsx("button", { onClick: handleClear, style: {
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            background: '#ffffff',
                            color: '#333333',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                        }, children: "Clear All" }), _jsx("button", { onClick: handleCancel, style: {
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            background: '#ffffff',
                            color: '#333333',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                        }, children: "Cancel" }), _jsxs("button", { onClick: handleConfirm, disabled: walls.length === 0, style: {
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: walls.length === 0 ? '#cccccc' : '#3498db',
                            color: '#ffffff',
                            cursor: walls.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                        }, children: ["Place on Canvas (", walls.length, ")"] })] })] }));
};
export default WallPreviewWindow;
//# sourceMappingURL=WallPreviewWindow.js.map