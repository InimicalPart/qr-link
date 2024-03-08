"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { Modal } from "../all/modal";

function randomString(length: number) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


export function StatisticsPage(
    {params,data,statisticsType}:{
        data: {
            scanData: any,
            important_moments: {
                timestamp: Date,
                update: {
                    [key: string]: boolean|string|Date,
                },
                identifier?: string,
            }[],
        },
        params: {id:string},
        statisticsType: string
    }
){

    let containers = useRef([] as { important: {
        timestamp: Date,
        update: {
            [key: string]: any,
        },
        identifier?: string,
    }; container: d3.Selection<SVGRectElement, unknown, null, undefined>; text: d3.Selection<SVGTextElement, unknown, null, undefined>; importantMoments: d3.Selection<SVGLineElement, unknown, null, undefined>; }[])

    switch (statisticsType) {
        case "timestamp": statisticsType = "line"; break;
        case "device": ""
    }


    const graphRef = useRef(null);


    const width = 900,
    height = 470,
    marginTop = 20,
    marginRight = 20,
    marginBottom = 90,
    marginLeft = 40







        useEffect(() => {
            const isWithinXBounds = (a: { x: number; xx: number; }, b: { x: number; xx: number; }) => ((a.x >= b.x && a.x <= b.xx) || (a.xx >= b.x && a.xx <= b.xx)); //? x = left boundry, xx = right boundry

            if (statisticsType === "timestamp") {


                if (!data.important_moments.find(a=>a.update.today === "yes"))
                    data.important_moments.push({
                        timestamp: new Date(),
                        update: {
                            today: "yes",
                        }
                    })



                data.scanData = data.scanData.filter((a: { timestamp: string | number | Date; })=>!!a.timestamp || new Date(a.timestamp) as unknown as string !== "Invalid Date").map((a: { timestamp: string | number | Date; })=>{a.timestamp = new Date(a.timestamp); return a;});
                console.log(data.scanData)
                console.log(data.important_moments)

                //! Assign a random identifier to each important moment, for easier identification
                for (let importantIndex in data.important_moments) {
                    if (!data.important_moments[importantIndex].identifier) data.important_moments[importantIndex].identifier = randomString(16); 
                }

                
                const svg = d3.select(graphRef.current);
                // if (!svg) return
                const xDaysBoundsExtraLeft = 10;
                const xDaysBoundsExtraRight = 20;

                const xScale = d3.scaleTime()
                    .domain([
                        new Date(data.scanData.find((a: { timestamp: { getTime: () => number; }; }) => a.timestamp.getTime() === Math.min(...data.scanData.map((a: { timestamp: { getTime: () => any; }; }) => a?.timestamp?.getTime()))).timestamp.getTime() - (xDaysBoundsExtraLeft * 24 * 60 * 60 * 1000)),
                        new Date(data.scanData.find((a: { timestamp: { getTime: () => number; }; }) => a.timestamp.getTime() === Math.max(...data.scanData.map((a: { timestamp: { getTime: () => any; }; }) => a?.timestamp?.getTime()))).timestamp.getTime() + (xDaysBoundsExtraRight * 24 * 60 * 60 * 1000))
                    ])
                    .range([marginLeft, width - marginRight]);


                const maxDataHeight = Math.max(...fillWithZeros(removeSameDay(data.scanData.toSorted((a: { timestamp: { getTime: () => number; }; }, b: { timestamp: { getTime: () => number; }; }) => a.timestamp.getTime() - b.timestamp.getTime()))).map(d => d.count));

                const rounded = Math.round(maxDataHeight + (maxDataHeight * 0.5));

                const yScale = d3.scaleLinear()
                    .domain([0, rounded >= 10 ? rounded : 10])
                    .range([height - marginBottom, marginTop]);

                    const line = d3.line<{ timestamp: Date; count: number }>()
                    .x((d) => xScale(new Date(d.timestamp.setHours(0,0,0,0))))
                    .y((d) => yScale(d.count));

                svg.selectAll("#clip")
                    .data([0], (d:any)=>d)
                    .join(enter => enter.append("clipPath")
                        .attr("id", "clip")
                        .append("rect")
                        .attr("width", width - marginRight - marginLeft)
                        .attr("height", height - marginBottom - marginTop + 4)
                        .attr("x", marginLeft)
                        .attr("y", marginTop)
                    );
                
                svg.selectAll(".line-path")
                    .data([fillWithZeros(removeSameDay(data.scanData.toSorted((a: { timestamp: { getTime: () => number; }; }, b: { timestamp: { getTime: () => number; }; }) => a.timestamp.getTime() - b.timestamp.getTime())))], (d:any)=>d)
                    .join(
                        enter => enter.append("path")
                            .classed("line-path",true)
                            .attr("fill", "none")
                            .attr("stroke", "black")
                            .attr("stroke-width", 2)
                            .attr("d", line as any)
                            .attr("clip-path", "url(#clip)"),
                        update => update,
                        exit => exit.remove()
                    );

                svg.selectAll(".x-axis")
                    .data([0], (d:any)=>d)
                    .join(enter => enter.append("g")
                        .classed("x-axis", true)
                        .attr("transform", `translate(0, ${height - marginBottom})`)
                        .call(d3.axisBottom(xScale)), update => update, exit => exit.remove())

                svg.selectAll(".y-axis")
                    .data([0], (d:any)=>d)
                    .join(enter => enter.append("g")
                        .classed("y-axis", true)
                        .attr("transform", `translate(${marginLeft}, 0)`)
                        .call(d3.axisLeft(yScale))
                    , update => update, exit => exit.remove())




                    
                    
                    svg.selectAll(".important-moments-line")
                        .data(data.important_moments, (d:any)=>d.timestamp.getTime())
                        .join(
                            enter => (
                                enter.append("line")
                                .attr("x1", d=>xScale(new Date(d.timestamp.setHours(0,0,0,0))))
                                .attr("x2", d => xScale(new Date(d.timestamp.setHours(0,0,0,0))))
                                .attr("y1", marginTop)
                                .attr("y2", d => yScale(fillWithZeros(removeSameDay(data.scanData.toSorted((a: { timestamp: { getTime: () => number; }; }, b: { timestamp: { getTime: () => number; }; }) => a.timestamp.getTime() - b.timestamp.getTime()))).find(a => a.timestamp.getTime() == new Date(d.timestamp.setHours(0,0,0,0)).getTime())?.count || 0))
                                .attr("stroke", d=>determineColorBasedOnUpdate(d.update))
                                .attr("stroke-width", 1.25)
                                .attr("stroke-dasharray",d=> isToday(d) ? "5" : "none")
                                .attr("clip-path", "url(#clip)")
                                .attr("id", d=>d.identifier)
                                .classed("important-moments-line", true)
                            ),
                            update => (update),
                            exit => (
                                exit.remove()
                            )
                        )

                    
                    svg.selectAll(".important-moments-container")
                        .data(data.important_moments, (d:any)=>d.timestamp.getTime())
                        .join(enter=>(
                            enter.append("rect")
                            .attr("x", d=>xScale(new Date(d.timestamp.setHours(0,0,0,0))))
                                .attr("y", marginTop)
                                .attr("width", (d) => {
                                    const textWidth = getTextSize(d, svg).width;
                                    return textWidth + 20 + (isToday(d) ? 40 : 0);
                                })
                                .attr("height", (d) => {
                                    const textHeight = getTextSize(d, svg).height;
                                    return textHeight + 10;
                                })
                                .style("padding", "5px")
                                .style("fill", d=>determineColorBasedOnUpdate(d.update))
                                .style("opacity", 0.5)
                                .attr("clip-path", "url(#clip)")
                                .attr("id", d=>d.identifier)
                                .classed("important-moments-container", true)
                        ), update=>update, exit=>exit.remove())


                svg.selectAll(".important-moments-text")
                    .data(data.important_moments, (d:any)=>d.timestamp.getTime())
                    .join(
                        enter=>(enter.append("text")
                            .attr("x",d=> xScale(new Date(d.timestamp.setHours(0,0,0,0))) + 10 + (isToday(d) ? 20 : 0))
                            .attr("y", marginTop + 15)
                            .attr("fill", "white")
                            .text(d=>importantMomentToText(d)[0])
                            .style("font-size", "10px")
                            .attr("clip-path", "url(#clip)")
                            .attr("id", d=>d.identifier)
                            .classed("important-moments-text", true)
                        ),
                        update=>(update),
                        exit=>exit.remove()
                    )
                




                svg.selectAll(".scan-data-circles")
                    .data(fillWithZeros(removeSameDay(data.scanData.toSorted((a: { timestamp: { getTime: () => number; }; }, b: { timestamp: { getTime: () => number; }; }) => a.timestamp.getTime() - b.timestamp.getTime()))), (d:any) => d.timestamp.getTime())
                    .join(enter=>(
                        enter
                        .append("circle")
                        .attr("cx", (d) => xScale(new Date(d.timestamp.setHours(0,0,0,0))))
                        .attr("cy", (d) => yScale(d.count))
                        .attr("r", d=>d.count==0?1:2)
                        .attr("stroke", "black")
                        .attr("fill", "white")
                        .attr("stroke-width", 2)
                        .attr("id", d=>d.timestamp.getTime())
                        .attr("clip-path", "url(#clip)")
                        .classed("scan-data-circles", true)
                    ), update=>(update), exit=>exit.remove())

                svg.selectAll(".overlay")
                    .data([0], (d:any)=>d)
                    .join(enter=>(
                        enter
                        .append("rect")
                        .attr("x", marginLeft)
                        .attr("y", marginTop)
                        .attr("height", height - marginBottom - marginTop)
                        .attr("width", width - marginRight - marginLeft)
                        .style("fill", "none")
                        .style("pointer-events", "none")
                        .attr("clip-path", "url(#clip)")
                    ), update=>update, exit=>exit.remove())


                const zoomBehavior = d3.zoom()
                    .scaleExtent([0, 40]) // Set the zoom scale range
                    .on("zoom", (event) => {

                        //! Create a new scale based on the new position / zoom level
                        let newXScale = event.transform.rescaleX(xScale);

                        //! Update the x-axis based on the new scale
                        (svg.select(".x-axis") as any).call(d3.axisBottom(newXScale));
                        
                        //! Update the line's position based on the new scale
                        (svg.selectAll(".line-path") as any).attr("d", line.x((d:any) => newXScale(new Date(d.timestamp.setHours(0,0,0,0)))))

                        //! Update the circles' position based on the new scale
                        svg.selectAll(".scan-data-circles").attr("cx", (d:any) => newXScale(new Date(d.timestamp.setHours(0,0,0,0))));
                        
                        //! Update the important moments' position based on the new scale
                        containers.current.forEach(container => {
                            setContainerWidth(container, newXScale(new Date(container.important.timestamp.setHours(0,0,0,0))));
                        });
                        
                        try {
                            if (containers.current.length > 0) containers.current[0].container.attr("y");
                            //! Run the container collision check and fix function
                            checkContainerCollision(svg);
                        } catch (e) {}

                        

                    })

                svg.call(zoomBehavior as any);
                containers.current = data.important_moments.map((important, index) => {
                    return {
                        important,
                        container: svg.select(".important-moments-container#" + important.identifier),
                        text: svg.select(".important-moments-text#" + important.identifier),
                        importantMoments: svg.select(".important-moments-line#" + important.identifier),
                    }
                })

                console.log(containers)
                try {
                    if (containers.current.length > 0) containers.current[0].container.attr("y");
                    checkContainerCollision(svg);
                } catch (e) {
                    console.log(e) 
                }

            } else if (statisticsType === "OS") {
                // Input data is gonna be {"BrowserName": scanCount}
                const svg = d3.select(graphRef.current);
                const xScale = d3.scaleBand()
                    .domain(Object.keys(data.scanData).map(a=>a=="undefined"?"Other":a))
                    .range([marginLeft, width - marginRight])
                    .padding(0.1);

                const yScale = d3.scaleLinear()
                    .domain([0, Math.max(...Object.values(data.scanData as { [key: string]: number; }))])
                    .range([height - marginBottom, marginTop]);

                svg.selectAll(".bar")
                    .data(Object.entries(data.scanData as { [key: string]: number; }), (d:any)=>d[0])
                    .join(
                        enter => enter.append("rect")
                            .attr("x", d=>xScale(d[0] == "undefined" ? "Other" : d[0]))
                            .attr("y", d=>yScale(d[1]))
                            .attr("width", xScale.bandwidth())
                            .attr("height", d=>height - marginBottom - yScale(d[1]))
                            .attr("fill", "darkblue")
                            .classed("bar", true)
                            .on("mouseenter", (event, d) => {
                                //set fill to lightblue
                                //show tooltip with number
                            
                                event.target.style.fill = "lightblue";
                            }) 
                            ,
                        update => update,
                        exit => exit.remove()
                    )

                svg.selectAll(".x-axis")
                    .data([0], (d:any)=>d)
                    .join((enter:any) => enter.append("g")
                        .classed("x-axis", true)
                        .attr("transform", `translate(0, ${height - marginBottom})`)
                        .call(d3.axisBottom(xScale))
                        .selectAll("text")
                        .attr("y", 0)
                        .attr("x", 9)
                        .attr("dy", ".35em")
                        .attr("transform", "rotate(45)")
                        .style("text-anchor", "start")
                        , update => update, exit => exit.remove())

                svg.selectAll(".y-axis")
                    .data([0], (d:any)=>d)
                    .join(enter => enter.append("g")
                        .classed("y-axis", true)
                        .attr("transform", `translate(${marginLeft}, 0)`)
                        .call(d3.axisLeft(yScale))
                    , update => update, exit => exit.remove())


            }

            // return ()=>{   
            //     console.log("Cleaning up")
            //     containers = [];
            // }

            function isFreeToTheTop(container: any) {
                // check if the container is free to the top, meaning if there is not an intersection between and it and any other container above it
                const containersAbove = getContainersAbove(container);
                return !containersAbove.length;
            }
    
            function calculateNewHeight(container: {
                container: any;
                important: any;
                importantMoments: any;
                text: any;
            }) {
                const intersects = getIntersectsAtSameHeight(container);
                const isIntersecting = intersects.length !== 0;
                if (isIntersecting) {
                    
                    // debugger
                    const containersBelow = getContainersBelow(container);
                    if (!containersBelow.length) {
                        return {height:parseFloat(intersects[0].container.attr("y")) + parseFloat(intersects[0].container.attr("height")),children:null}
                    }
    
                    const belowbutbefore = containersBelow.filter(a=>a.important.timestamp.getTime() < container.important.timestamp.getTime());
                    const belowbutafter = containersBelow.filter(a=>a.important.timestamp.getTime() > container.important.timestamp.getTime());
    
    
                    const furthestDown = getFurthestDown(belowbutbefore) ?? intersects[0]
                    const newHeight = parseFloat(furthestDown.container.attr("y")) + parseFloat(furthestDown.container.attr("height"));
                    
                    const children: {
                        [key: string]: {
                            height: number,
                        };
                    } = {}
                    
                    let newChildPosition = newHeight + parseFloat(container.container.attr("height"));
                    
                    for (let below of belowbutafter) {
                        children[below.important.identifier as string] = {height:newChildPosition};
                        newChildPosition += parseFloat(below.container.attr("height"));
                    }
                    
                    return {height:newHeight, children};
                } else {
    
                    const canMoveToTop = isFreeToTheTop(container);
                    if (canMoveToTop) {
                        return {height:marginTop, children:null};
                    } else {
                        const containersAbove = getContainersAbove(container);
                        const directlyAbove = getDirectlyAbove(containersAbove);
                        
                        const newHeight = parseFloat(directlyAbove.container.attr("y")) + parseFloat(directlyAbove.container.attr("height"));
                        return {height:newHeight, children:null};
                    }
                }
            }
    
    
            function checkContainerCollision(svg: any) {
                console.log("Running check function.")
                const containersCopy = [...containers.current].toSorted((a, b) => b.important.timestamp.getTime() - a.important.timestamp.getTime());
    
                let needToRerun = false;
                console.log(containersCopy)
                containersCopy.forEach(container => {
                    const currentContainerY = parseFloat(container.container.attr("y"));
                    const newHeight = calculateNewHeight(container);
                    if (newHeight.height !== currentContainerY) {
                        setContainerHeight(container, newHeight.height);
                        needToRerun = true;
                    }
                    if (newHeight.children) {
                        for (let childIdentifier in newHeight.children) {
                            const child = containersCopy.find(a=>a.important.identifier === childIdentifier);
                            setContainerHeight(child, newHeight.children[childIdentifier].height);
                            needToRerun = true;
                        }
                    }
                })
    
                containers.current = [...containersCopy].toSorted((a, b) => a.important.timestamp.getTime() - b.important.timestamp.getTime());
    
                if (needToRerun) {
                    console.log("A change was made, rerunning check function.")
                    return checkContainerCollision(svg);
                }
    
                console.log("No changes were made, check function finished.")
            }
    
    
            function getContainersBelow(container: any) {
                const currentContainerY = parseFloat(container.container.attr("y"));
                return containers.current.filter(a=>parseFloat(a.container.attr("x")) !== parseFloat(container.container.attr("x")))
                    .filter(a=>parseFloat(a.container.attr("y")) > currentContainerY && isWithinXBounds(
                        {  
                            x: parseFloat(container.container.attr("x")),                                                                                                  //! Left boundry of the current container
                            xx: parseFloat(container.container.attr("x")) + parseFloat(container.container.attr("width"))                                                  //! Right boundry of the current container
                        },
                        {
                            x: parseFloat(a.container.attr("x")),                                                                                                           //! Left boundry of the container above the current container
                            xx: parseFloat(a.container.attr("x")) + parseFloat(a.container.attr("width"))                                                                   //! Right boundry of the container above the current container
                        }
                    ));
            }
    
            function getContainersAbove(container: any) {
                
                const currentContainerY = parseFloat(container.container.attr("y"));
                return containers.current.filter(a=>parseFloat(a.container.attr("x")) !== parseFloat(container.container.attr("x")))
                    .filter(a=>parseFloat(a.container.attr("y")) < currentContainerY && isWithinXBounds(
                        {  
                            x: parseFloat(container.container.attr("x")),                                                                                                  //! Left boundry of the current container
                            xx: parseFloat(container.container.attr("x")) + parseFloat(container.container.attr("width"))                                                  //! Right boundry of the current container
                        },
                        {
                            x: parseFloat(a.container.attr("x")),                                                                                                           //! Left boundry of the container above the current container
                            xx: parseFloat(a.container.attr("x")) + parseFloat(a.container.attr("width"))                                                                   //! Right boundry of the container above the current container
                        }
                    ));
            }
    
            function getFurthestDown(containers: {
                container: any;
                important: any;
                importantMoments: any;
                text: any;
            }[]) {
                return containers.find(a=>parseFloat(a.container.attr("y")) == Math.max(...containers.map(a=>parseFloat(a.container.attr("y")))));
            }
    
            function getDirectlyAbove(above: {
                container: any;
                important: any;
                importantMoments: any;
                text: any;
            }[]) {
                return above.find(a=>parseFloat(a.container.attr("y")) == Math.max(...above.map(a=>parseFloat(a.container.attr("y")))));
            }
    
            function getIntersectsAtSameHeight(container: {
                container: any;
                important: any;
                importantMoments: any;
                text: any;
            }) {
                const currentContainerY = parseFloat(container.container.attr("y"));
                return containers.current.filter(a=>parseFloat(a.container.attr("x")) !== parseFloat(container.container.attr("x")))                                               //? Don't check against itself
                    .filter(a=>parseFloat(a.container.attr("y")) == currentContainerY && isWithinXBounds(                                                              //? Check if the containers are at the same height and if they intersect
                        {  
                            x: parseFloat(container.container.attr("x")),                                                                                                  //! Left boundry of the current container
                            xx: parseFloat(container.container.attr("x")) + parseFloat(container.container.attr("width"))                                                  //! Right boundry of the current container
                        },
                        {
                            x: parseFloat(a.container.attr("x")),                                                                                                           //! Left boundry of the container above the current container
                            xx: parseFloat(a.container.attr("x")) + parseFloat(a.container.attr("width"))                                                                   //! Right boundry of the container above the current container
                        } 
                    ));
            }
    
            function setContainerWidth(container: {
                container: any;
                important: any;
                importantMoments: any;
                text: any;
            }, width: number) {
                container.container.attr("x", width);
                container.text.attr("x", width + 10 + (isToday(container.important) ? 20 : 0));
                container.importantMoments.attr("x1", width);
                container.importantMoments.attr("x2", width);
            }
    
            function setContainerHeight(container: {
                container: any;
                important: any;
                importantMoments: any;
                text: any;
            }, height: number) {
                console.log("Setting '"+container.text.text() + "' to Y: " + height + " from Y: " + parseFloat(container.container.attr("y")));
                container.text.attr("y", height + 15);
                container.importantMoments.attr("y1", height);
                container.container.attr("y", height);
            }
    

            function getScanCountAtDay(day: Date) {
                day = new Date(day.setHours(0,0,0,0));
                return data.scanData.map((a: { timestamp: { setHours: (arg0: number, arg1: number, arg2: number, arg3: number) => string | number | Date; }; })=>new Date(a.timestamp.setHours(0,0,0,0))).filter((a: { getTime: () => number; })=>a.getTime() == day.getTime()).length;
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
                let firstDay = new Date((data.important_moments.find(a=>a.update.created)?.timestamp ?? data.scanData[0].timestamp).setHours(0,0,0,0));
                let lastDay = new Date();
        
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
                const text = importantMomentToText(d)[0];
                const dummyText = svg.append("text").text(text).style("font-size", "10px");
                const textWidth = dummyText.node().getBBox().width;
                const textHeight = dummyText.node().getBBox().height;
                dummyText.remove();
        
                return {
                    width: textWidth,
                    height: textHeight,
                };
            }
        
            function importantMomentToText(d: { timestamp?: Date; update: {
                [key: string]: any;
            }; }) {
                let rtrn = []
        
                for (let key of Object.keys(d.update).filter(a=>!a.startsWith("settings.scanData.information."))) {
                    switch (key) {
                        case "created":
                            rtrn.push("QR-code was created");
                            break;
                        case "today":
                            rtrn.push("Today");
                            break;
                        case "id":
                            rtrn.push("ID was changed");
                            break;
                        default:
                            rtrn.push(key);
                            break;
                    }
                }
                for (let key of Object.keys(d.update).filter(a=>a.startsWith("settings.scanData.information."))) {
                    rtrn.push("'" + key.replace("settings.scanData.information.","") + "' was turned " + (d.update[key] ? "on" : "off"));
                }
        
                return rtrn
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
        
            function isToday(moment:{
                timestamp: Date,
                update: {
                    [key: string]: any,
                }
            }) {
                const today = new Date();
                return new Date(moment.timestamp).setHours(0,0,0,0) === today.setHours(0,0,0,0) && moment.update.today == "yes";
            }
        

        }, [data,statisticsType]);




        return <>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            ref={graphRef}></svg>
        </>;
    }
