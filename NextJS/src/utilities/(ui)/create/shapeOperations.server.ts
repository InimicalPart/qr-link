//! ChatGPT carried 90% of the code, I just made some tweaks to make it work better

import type * as Types from "leaflet";
export interface Circle {
    center: Types.LatLngTuple;
    radius: number;
    [key:string]: any
}

export interface Polygon {
    positions: Types.LatLngTuple[];
    [key:string]: any
}

type Shape = Circle | Polygon;

export function intersect(shape1: Shape, shape2: Shape): boolean {
    if (isCircle(shape1) && isCircle(shape2)) {
        return circleCircleIntersect(shape1, shape2);
    } else if (isCircle(shape1) && isPolygon(shape2)) {
        return circlePolygonIntersect(shape1, shape2);
    } else if (isPolygon(shape1) && isCircle(shape2)) {
        return circlePolygonIntersect(shape2, shape1);
    } else if (isPolygon(shape1) && isPolygon(shape2)) {
        return polygonPolygonIntersect(shape1, shape2);
    } else {
        throw new Error('Invalid shapes');
    }
}

function isCircle(shape: Shape): shape is Circle {
    return (shape as Circle).radius !== undefined;
}

function isPolygon(shape: Shape): shape is Polygon {
    return (shape as Polygon).positions !== undefined;
}


function circleCircleIntersect(circle1: Circle, circle2: Circle): boolean {
    if (contains(circle1, circle2) || contains(circle2, circle1)) {
        return true; // One circle is entirely contained within the other
    }

    const distanceCenter = getDistanceFromLatLonInMeters(circle1.center[0], circle1.center[1], circle2.center[0], circle2.center[1]);
    return distanceCenter <= circle1.radius + circle2.radius;
}

function circlePolygonIntersect(circle: Circle, polygon: Polygon): boolean {
    if (contains(circle, polygon) || contains(polygon, circle)) {
        return true; // Circle is entirely contained within polygon or vice versa
    }

    // Check if the circle intersects with any segment of the polygon
    const numVertices = polygon.positions.length;
    for (let i = 0; i < numVertices; i++) {
        const p1 = polygon.positions[i];
        const p2 = polygon.positions[(i + 1) % numVertices];
        if (segmentCircleIntersect(p1[0], p1[1], p2[0], p2[1], circle)) {
            return true;
        }
    }

    return false;
}


function polygonPolygonIntersect(polygon1: Polygon, polygon2: Polygon): boolean {
    if (contains(polygon1, polygon2) || contains(polygon2, polygon1)) {
        return true; // One polygon is entirely contained within the other
    }

    // Check if any segment of polygon1 intersects with polygon2
    const numVertices1 = polygon1.positions.length;
    for (let i = 0; i < numVertices1; i++) {
        const p1 = polygon1.positions[i];
        const p2 = polygon1.positions[(i + 1) % numVertices1];
        if (segmentPolygonIntersect(p1[0], p1[1], p2[0], p2[1], polygon2)) {
            return true;
        }
    }

    // Check if any segment of polygon2 intersects with polygon1
    const numVertices2 = polygon2.positions.length;
    for (let i = 0; i < numVertices2; i++) {
        const p1 = polygon2.positions[i];
        const p2 = polygon2.positions[(i + 1) % numVertices2];
        if (segmentPolygonIntersect(p1[0], p1[1], p2[0], p2[1], polygon1)) {
            return true;
        }
    }

    return false;
}


function segmentCircleIntersect(lat1: number, lon1: number, lat2: number, lon2: number, circle: Circle): boolean {
    const d1 = getDistanceFromLatLonInMeters(lat1, lon1, circle.center[0], circle.center[1]);
    const d2 = getDistanceFromLatLonInMeters(lat2, lon2, circle.center[0], circle.center[1]);
    const radius = circle.radius;

    if ((d1 < radius && d2 < radius) ||
        (d1 < radius && d2 > radius) ||
        (d1 > radius && d2 < radius)) {
        const lineLength = getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2);
        const crossProduct = Math.abs((lon2 - lon1) * (circle.center[0] - lat1) - (lat2 - lat1) * (circle.center[1] - lon1));
        return crossProduct <= radius * lineLength;
    }

    return false;
}

function isPointInsidePolygon(x: number, y: number, polygon: Polygon): boolean {
    let inside = false;
    const numVertices = polygon.positions.length;
    for (let i = 0, j = numVertices - 1; i < numVertices; j = i++) {
        const xi = polygon.positions[i][0], yi = polygon.positions[i][1];
        const xj = polygon.positions[j][0], yj = polygon.positions[j][1];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function segmentPolygonIntersect(x1: number, y1: number, x2: number, y2: number, polygon: Polygon): boolean {
    if (isPointInsidePolygon(x1, y1, polygon) || isPointInsidePolygon(x2, y2, polygon)) {
        return true;
    }

    const numVertices = polygon.positions.length;
    for (let i = 0; i < numVertices; i++) {
        const p1 = polygon.positions[i];
        const p2 = polygon.positions[(i + 1) % numVertices];
        if (segmentsIntersect(x1, y1, x2, y2, p1[0], p1[1], p2[0], p2[1])) {
            return true;
        }
    }

    return false;
}

function segmentsIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    const d1 = direction(x3, y3, x4, y4, x1, y1);
    const d2 = direction(x3, y3, x4, y4, x2, y2);
    const d3 = direction(x1, y1, x2, y2, x3, y3);
    const d4 = direction(x1, y1, x2, y2, x4, y4);
    return (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)));
}
            
function direction(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
    return (x3 - x1) * (y2 - y1) - (x2 - x1) * (y3 - y1);
}

export function contains(shape1: Shape, shape2: Shape): boolean {
    if (isCircle(shape1) && isCircle(shape2)) {
        return circleContainsCircle(shape1, shape2);
    } else if (isCircle(shape1) && isPolygon(shape2)) {
        return circleContainsPolygon(shape1, shape2);
    } else if (isPolygon(shape1) && isCircle(shape2)) {
        return polygonContainsCircle(shape1, shape2);
    } else if (isPolygon(shape1) && isPolygon(shape2)) {
        return polygonContainsPolygon(shape1, shape2);
    } else {
        throw new Error('Invalid shapes');
    }
}

function circleContainsCircle(circle1: Circle, circle2: Circle): boolean {
    const distance = getDistanceFromLatLonInMeters(circle1.center[0], circle1.center[1], circle2.center[0], circle2.center[1]);
    return distance + circle2.radius <= circle1.radius;

}

function circleContainsPolygon(circle: Circle, polygon: Polygon): boolean {
    for (const vertex of polygon.positions) {
        if (!pointInCircle(vertex, circle)) {
            return false;
        }
    }
    return true;
}

function polygonContainsCircle(polygon: Polygon, circle: Circle): boolean {
    const [circleLat, circleLong] = circle.center;
    if (!isPointInsidePolygon(circleLat, circleLong, polygon)) {
        return false;
    }
    return true;
}

function polygonContainsPolygon(polygon1: Polygon, polygon2: Polygon): boolean {
    for (const vertex of polygon2.positions) {
        if (!isPointInsidePolygon(vertex[0], vertex[1], polygon1)) {
            return false;
        }
    }
    return true;
}

function pointInCircle(point: Types.LatLngTuple, circle: Circle): boolean {
    const [circleLat, circleLong] = circle.center;
    const [pointLat, pointLong] = point;
    const distance = getDistanceFromLatLonInMeters(circleLat, circleLong, pointLat, pointLong);
    return distance <= circle.radius;
}
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c * 1000; // Distance in m
    return d;
}

function deg2rad(arg0: number) {
    return arg0 * (Math.PI / 180)
}