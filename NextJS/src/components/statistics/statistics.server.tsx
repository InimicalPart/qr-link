"use client";
import * as d3 from "d3";
import { useEffect, useRef } from "react";
export function StatisticsPage(
    {data,graphType}:{
        data: {
            scanData: {
                fingerprint?: string,
                location?: {
                    latitude: number,
                    longitude: number,
                    accuracy: number,
                },
                ["user-agent"]?: string,
                ip?: string,
                timestamp: Date,
            }[],
            important_moments: {
                timestamp: Date,
                update: {
                    [key: string]: any,
                },
            }[],
        },
        graphType: "line"
    }
){

    data.important_moments.push({
        timestamp: new Date(),
        update: {
            today: "yes",
        }
    })

    const containers: { important: any; container: d3.Selection<SVGRectElement, unknown, null, undefined>; text: d3.Selection<SVGTextElement, unknown, null, undefined>; importantMoments: d3.Selection<SVGLineElement, unknown, null, undefined>; }[]= []

    function getScanCountAtDay(day: Date) {
        day = new Date(day.setHours(0,0,0,0));
        return data.scanData.map(a=>new Date(a.timestamp.setHours(0,0,0,0))).filter(a=>a.getTime() == day.getTime()).length;
    }
    function removeSameDay(scanData: { timestamp: Date; }[]) {
        let seen = new Set();
        return scanData.filter(item => {
            let day = new Date(item.timestamp.setHours(0,0,0,0));
            return seen.has(day) ? false : seen.add(day);
        });

    }

    function fillWithZeros(scanData: { timestamp: Date; }[]) {
        // for every day between the first and last day, if it's not in the scanData, add it with '0' scans
        let firstDay = new Date(scanData[0].timestamp.setHours(0,0,0,0));
        let lastDay = new Date(scanData[scanData.length-1].timestamp.setHours(0,0,0,0));

        let days = [];
        for (let day = firstDay; day <= lastDay; day.setDate(day.getDate() + 1)) {
            days.push(new Date(day));
        }

        let result = [];
        for (let day of days) {
            let scanCount = getScanCountAtDay(day);
            result.push({timestamp: day, count: scanCount});
        }
        return result;
    }
    function getTextSize(d: { timestamp?: Date; update: any; }, svg: any) {
        const text = importantMomentToText(d);
        const dummyText = svg.append("text").text(text).style("font-size", "10px");
        const textWidth = dummyText.node().getBBox().width;
        const textHeight = dummyText.node().getBBox().height;
        dummyText.remove();

        return {
            width: textWidth,
            height: textHeight,
        };
    }

    function importantMomentToText(d: { timestamp?: Date; update: any; }) {
        if (Object.keys(d.update).includes("created")) {
            return "QR-code was created";
        } else if (Object.keys(d.update).includes("today")) {
            return "Today";
        } else if (Object.keys(d.update).includes("settings.scanData.information.timestamp")) {
            return "'timestamp' was turned " + (d.update["settings.scanData.information.timestamp"] ? "on" : "off");
        }
    }

    function determineColorBasedOnUpdate(update: any) {
        if (Object.keys(update).includes("created")) {
            return "blue";
        } else if (Object.keys(update).includes("today")) {
            return "black";
        } else if (Object.keys(update).some(a=>a.startsWith("settings.scanData.information."))) {
            let item = Object.keys(update).find(a => a.startsWith("settings.scanData.information."));
            console.log(item)
            if (update[item]) {
                return "green";
            } else {
                return "red";
            }
        } else {
            return "darkorange";
        }
    }

    function isToday(date: Date) {
        const today = new Date();
        return new Date(date).setHours(0,0,0,0) === today.setHours(0,0,0,0);
    }


    const width = 900,
    height = 400,
    marginTop = 20,
    marginRight = 20,
    marginBottom = 20,
    marginLeft = 40

        const graphRef = useRef(null);

        useEffect(() => {
            if (graphType === "line") {
                const svg = d3.select(graphRef.current)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height);


                const xDaysBoundsExtraLeft = 10
                const xDaysBoundsExtraRight = 20

                const xScale = d3.scaleTime()
                    .domain([
                        new Date(data.scanData.find(a => a.timestamp.getTime() === Math.min(...data.scanData.map(a => a?.timestamp?.getTime()))).timestamp.getTime() - (xDaysBoundsExtraLeft * 24 * 60 * 60 * 1000)),
                        new Date(data.scanData.find(a => a.timestamp.getTime() === Math.max(...data.scanData.map(a => a?.timestamp?.getTime()))).timestamp.getTime() + (xDaysBoundsExtraRight * 24 * 60 * 60 * 1000))
                    ])
                    .range([marginLeft, width - marginRight]);

                const maxDataHeight = Math.max(...fillWithZeros(removeSameDay(data.scanData.toSorted((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))).map(d => d.count));

                const rounded = Math.round(maxDataHeight + (maxDataHeight * 0.5))

                const yScale = d3.scaleLinear()
                    .domain([0, rounded >= 10 ? rounded : 10])
                    .range([height - marginBottom, marginTop])

                const line = d3.line<{ timestamp: Date; count: number }>()
                    .x((d) => xScale(new Date(d.timestamp.setHours(0,0,0,0))))
                    .y((d) => yScale(d.count));

                const clipPath = svg
                    .append("clipPath")
                    .attr("id", "clip")
                    .append("rect")
                    .attr("width", width - marginRight - marginLeft)
                    .attr("height", height - marginBottom - marginTop + 4)
                    .attr("x", marginLeft)
                    .attr("y", marginTop);

                const path = svg
                    .append("path")
                    .datum(fillWithZeros(removeSameDay(data.scanData.toSorted((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))))
                    .attr("fill", "none")
                    .attr("stroke", "black")
                    .attr("stroke-width", 2)
                    .attr("d", line as any)
                    .attr("clip-path", "url(#clip)");

                const xScaleG = svg.append("g")
                    .attr("transform", `translate(0, ${height - marginBottom})`)
                    .call(d3.axisBottom(xScale));

                const yScaleG = svg.append("g")
                    .attr("transform", `translate(${marginLeft}, 0)`)
                    .call(d3.axisLeft(yScale))




                for (let important of data.important_moments) {


                    const importantMoments = svg.append("line")
                        .attr("x1", xScale(new Date(important.timestamp.setHours(0,0,0,0))))
                        .attr("x2", () => xScale(new Date(important.timestamp.setHours(0,0,0,0))))
                        .attr("y1", marginTop)
                        .attr("y2", () => yScale(fillWithZeros(removeSameDay(data.scanData.toSorted((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))).find(a => a.timestamp.getTime() == new Date(important.timestamp.setHours(0,0,0,0)).getTime())?.count || 0))
                        .attr("stroke", determineColorBasedOnUpdate(important.update))
                        .attr("stroke-width", 1.25)
                        .attr("stroke-dasharray", isToday(important.timestamp) ? "5" : "none")
                        .attr("clip-path", "url(#clip)");



                    const container = svg
                        .append("rect")
                        .attr("x", xScale(new Date(important.timestamp.setHours(0,0,0,0))))
                            .attr("y", marginTop)
                            .attr("width", () => {
                                const textWidth = getTextSize(important, svg).width;
                                return textWidth + 20 + (isToday(important.timestamp) ? 40 : 0);
                            })
                            .attr("height", () => {
                                const textHeight = getTextSize(important, svg).height;
                                return textHeight + 10;
                            })
                            .style("padding", "5px")
                            .style("fill", determineColorBasedOnUpdate(important.update))
                            .style("opacity", 0.5)
                            .attr("clip-path", "url(#clip)");


                    const text = svg
                        .append("text")
                        .attr("x", xScale(new Date(important.timestamp.setHours(0,0,0,0))) + 10 + (isToday(important.timestamp) ? 40 : 0))
                        .attr("y", marginTop + 15)
                        .attr("fill", "white")
                        .text(importantMomentToText(important))
                        .style("font-size", "10px")
                        .attr("clip-path", "url(#clip)");
                    

                        containers.push({
                            container: container,
                            text: text,
                            importantMoments: importantMoments,
                            important: important
                        })


                }
                check(containers, xScale, svg);


                    const circles = svg.selectAll("circle")
                        .data(fillWithZeros(removeSameDay(data.scanData.toSorted((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))))
                        .enter()
                        .append("circle")
                        .attr("cx", (d) => xScale(new Date(d.timestamp.setHours(0,0,0,0))))
                        .attr("cy", (d) => yScale(d.count))
                        .attr("r", 2)
                        .attr("stroke", "black")
                        .attr("fill", "white")
                        
                        .attr("stroke-width", 2)
                        .attr("clip-path", "url(#clip)");

                const rect = svg.append("rect")
                    .attr("x", marginLeft)
                    .attr("y", marginTop)
                    .attr("height", height - marginBottom - marginTop)
                    .attr("width", width - marginRight - marginLeft)
                    .style("fill", "none")
                    .style("pointer-events", "all")
                    .attr("clip-path", "url(#clip)");


                const zoomBehavior = d3.zoom()
                    .scaleExtent([0, 40]) // Set the zoom scale range
                    .on("zoom", (event) => {
                        let newXScale = event.transform.rescaleX(xScale);
                        // let newYScale = event.transform.rescaleY(yScale);

                        // y not less than 0
                        // if (newYScale.domain()[0] < 0) {
                        //     newYScale = newYScale.domain([0, Math.round(maxDataHeight + (maxDataHeight * 0.5))]);
                        // } else if (newYScale.domain()[1] > Math.round(maxDataHeight + (maxDataHeight * 0.5))) {
                        //     newYScale = newYScale.domain([0, Math.round(maxDataHeight + (maxDataHeight * 0.5))]);
                        // }

                        xScaleG.call(d3.axisBottom(newXScale));

                        path.attr("d", line.x((d) => newXScale(d.timestamp)));
                        circles.attr("cx", (d) => newXScale(new Date(d.timestamp.setHours(0,0,0,0))));
                        for (let container of containers) {
                            container.container.attr("x", newXScale(new Date(container.important.timestamp.setHours(0,0,0,0))));
                            container.text.attr("x", newXScale(new Date(container.important.timestamp.setHours(0,0,0,0))) + 10 + (isToday(container.important.timestamp) ? 40 : 0));
                            container.importantMoments.attr("x1", newXScale(new Date(container.important.timestamp.setHours(0,0,0,0))));
                            container.importantMoments.attr("x2", newXScale(new Date(container.important.timestamp.setHours(0,0,0,0))));
                        }
                        check(containers, newXScale, svg);

                    });

                svg.call(zoomBehavior as any);
                graphRef.current = svg.node();

                return () => {
                    svg.remove();
                }
            }
        }, [data, graphType]);


        function isFreeToTheTop(container: any, containers: any[], newXScale: any, svg: any) {
            // check if the container is free to the top, meaning if there is not an intersection between and it and any other container above it
            const { boundries, intersections } = BoundsAndIntersections(containers, newXScale, svg, true);
            // all containers that are above the current container
            const above = boundries.filter(a => a.y < parseFloat(container.container.attr("y")));

            for (let a of above) {
                if (intersections.some(b => b.x == a.x && b.xx == a.xx && b.y == a.y)) {
                    return false;
                }
            }
            return true;

        }

        function check(containers: any, newXScale: any, svg: any) {
            const { boundries, intersections } = BoundsAndIntersections(containers, newXScale, svg);

            if (intersections.length > 0) {
                console.log("Found " + intersections.length + " intersections")
                for (let intersection of intersections) {

                    const farthest = intersection.timestamp.getTime() > intersection.timestamp1.getTime() ? intersection.timestamp : intersection.timestamp1;
                    const closest = intersection.timestamp.getTime() < intersection.timestamp1.getTime() ? intersection.timestamp : intersection.timestamp1;

                    const containerF = containers.find((a: { important: { timestamp: { getTime: () => number; }; }; }) => a.important.timestamp.getTime() == farthest.getTime());
                    const containerC = containers.find((a: { important: { timestamp: { getTime: () => number; }; }; }) => a.important.timestamp.getTime() == closest.getTime());

                    const textHeight = getTextSize(containerC.important, svg).height;
                    containerF.container.attr("y", parseFloat(containerF.container.attr("y")) + textHeight+10);
                    containerF.text.attr("y", parseFloat(containerF.text.attr("y")) + textHeight + 10);
                    containerF.importantMoments.attr("y1", parseFloat(containerF.importantMoments.attr("y1")) + textHeight+10);
                }

                const { intersections: newIntersections } = BoundsAndIntersections(containers, newXScale, svg, true, true);
                // invert it, so only store the ones that are not in the newIntersections list
                const noIntersections = boundries.filter(a => !newIntersections.some(b => a.x == b.x && a.xx == b.xx));


                for (let noIntersection of noIntersections) {
                    // if their height is not margin top, set it to margin top
                    const container = containers.find((a: { container: { attr: (arg0: string) => number; }; }) => a.container.attr("y") == noIntersection.y);
                    if (parseFloat(container.container.attr("y")) != marginTop) {
                        console.log("Adjusting " + noIntersection.y + " to " + marginTop + " for a container with text '" + container.text.text() + "' that has no intersections.")
                        container.container.attr("y", marginTop);
                        container.text.attr("y", marginTop + 15);
                        container.importantMoments.attr("y1", marginTop);
                    }

                }


                console.log("Adjusted, checking again...")
                check(containers, newXScale, svg);
            } else {
                console.log("No intersections found")

                const { intersections: newIntersections } = BoundsAndIntersections(containers, newXScale, svg, true, true);
                // invert it, so only store the ones that are not in the newIntersections list
                console.log(newIntersections.map(a=>a.timestamp.toLocaleString() + " - " + a.timestamp1.toLocaleString()))
                const noIntersections = boundries.filter(a => !newIntersections.some(b => a.x == b.x && a.xx == b.xx));
                let needToRerun = false
                for (let noIntersection of newIntersections) {

                    if (noIntersections.indexOf(noIntersection) == -1) {
                        if (!isFreeToTheTop(containers.find((a: { container: { attr: (arg0: string) => number; }; }) => a.container.attr("y") == noIntersection.y), containers, newXScale, svg)) {
                            console.log(containers.find((a: { container: { attr: (arg0: string) => number; }; }) => a.container.attr("y") == noIntersection.y).important.timestamp.toLocaleString() + " is not free to the top, skipping...")
                            continue;
                        } else {                            
                            const container = containers.find((a: { container: { attr: (arg0: string) => number; }; }) => a.container.attr("y") == noIntersection.y);
                            if (parseFloat(container.container.attr("y")) != marginTop) {
                                console.log(containers.find((a: { container: { attr: (arg0: string) => number; }; }) => a.container.attr("y") == noIntersection.y).important.timestamp.toLocaleString() + " is free to the top, continuing...")
                                needToRerun = true;
                            
                            }
                        }
                    }

                    // if their height is not margin top, set it to margin top
                    const container = containers.find((a: { container: { attr: (arg0: string) => number; }; }) => a.container.attr("y") == noIntersection.y);
                    if (parseFloat(container.container.attr("y")) != marginTop) {
                        console.log("Adjusting " + noIntersection.y + " to " + marginTop + " for a container with text '" + container.text.text() + "' that has no intersections.")
                        container.container.attr("y", marginTop);
                        container.text.attr("y", marginTop + 15);
                        container.importantMoments.attr("y1", marginTop);
                    }

                }
                if (needToRerun) {
                    console.log("Adjusted, checking again...")
                    check(containers, newXScale, svg);
                }

            }

        }

        function BoundsAndIntersections(containers: any[], newXScale: (arg0: Date) => any, svg: any, ignoreY=false, noIgnoreList=false) {
            const boundries: {
                x: number,
                xx: number,
                y: number
            }[] = []
            for (let container of containers.toSorted((a: { important: { timestamp: { getTime: () => number; }; }; }, b: { important: { timestamp: { getTime: () => number; }; }; }) => a.important.timestamp.getTime() - b.important.timestamp.getTime())) { // sort by timestamp ascending (meaning the first element is the oldest)
                boundries.push( {
                        x:newXScale(new Date(container.important.timestamp.setHours(0,0,0,0))),
                        xx:newXScale(new Date(container.important.timestamp.setHours(0,0,0,0))) + getTextSize(container.important, svg).width + 20 + (isToday(container.important.timestamp) ? 40 : 0),
                        y:parseFloat(container.container.attr("y")),
                    }
                )
            }

            const intersections: {
                x: number,
                xx: number,
                y: number,
                timestamp: Date,
                x1: number,
                xx1: number,
                y1: number,
                timestamp1: Date,
            }[] = []

            const ignoreList: {
                [key: string]: string[]
            }={}


            for (let boundry of boundries) {
                for (let boundry1 of boundries) {
                    if (ignoreList[boundry.x+"-"+boundry.xx+"-"+boundry.y] && ignoreList[boundry.x+"-"+boundry.xx+"-"+boundry.y].includes(boundry1.x+"-"+boundry1.xx+"-"+boundry1.y) && !noIgnoreList) {
                        console.log("Ignoring " + boundry.x + "-" + boundry.xx + "-" + boundry.y + " and " + boundry1.x + "-" + boundry1.xx + "-" + boundry1.y + " because it's in the ignore list.")
                        continue;
                    }
                    if (boundry != boundry1 && (boundry.y == boundry1.y || ignoreY)) {
                        if (boundry.x >= boundry1.x && boundry.x <= boundry1.xx) {
                            intersections.push({
                                x: boundry.x,
                                xx: boundry.xx,
                                y: boundry.y,
                                timestamp: new Date(containers.find(a => newXScale(new Date(a.important.timestamp.setHours(0,0,0,0))) == boundry.x).important.timestamp.setHours(0,0,0,0)),
                                x1: boundry1.x,
                                xx1: boundry1.xx,
                                y1: boundry1.y,
                                timestamp1: new Date(containers.find(a => newXScale(new Date(a.important.timestamp.setHours(0,0,0,0))) == boundry1.x).important.timestamp.setHours(0,0,0,0)),
                            })
                            if (ignoreList[boundry.x+"-"+boundry.xx+"-"+boundry.y]) {
                                ignoreList[boundry.x+"-"+boundry.xx+"-"+boundry.y].push(boundry1.x+"-"+boundry1.xx+"-"+boundry1.y)
                            } else ignoreList[boundry1.x+"-"+boundry1.xx+"-"+boundry1.y] = [boundry.x+"-"+boundry.xx+"-"+boundry.y]
                        } else if (boundry.xx >= boundry1.x && boundry.xx <= boundry1.xx) {
                            intersections.push({
                                x: boundry.x,
                                xx: boundry.xx,
                                y: boundry.y,
                                timestamp: new Date(containers.find(a => newXScale(new Date(a.important.timestamp.setHours(0,0,0,0))) == boundry.x).important.timestamp.setHours(0,0,0,0)),
                                x1: boundry1.x,
                                xx1: boundry1.xx,
                                y1: boundry1.y,
                                timestamp1: new Date(containers.find(a => newXScale(new Date(a.important.timestamp.setHours(0,0,0,0))) == boundry1.x).important.timestamp.setHours(0,0,0,0)),
                            })

                            if (ignoreList[boundry.x+"-"+boundry.xx+"-"+boundry.y]) {
                                ignoreList[boundry.x+"-"+boundry.xx+"-"+boundry.y].push(boundry1.x+"-"+boundry1.xx+"-"+boundry1.y)
                            } else ignoreList[boundry1.x+"-"+boundry1.xx+"-"+boundry1.y] = [boundry.x+"-"+boundry.xx+"-"+boundry.y]
                        }


                    }
                }
            }

            return {
                boundries,
                intersections
            }
        }


        return <div ref={graphRef}></div>;
    }
