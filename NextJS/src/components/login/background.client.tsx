"use client";

import { useEffect } from "react";

export default function Background({color="#000000"}: {color?: string}) {


    useEffect(() => {
                /*-----------------------------------------------------------------*/
        /* Source for the background: https://codepen.io/LeonGr/pen/eYoZJB */
        /*                                                                 */
        /*                         Thanks @LeonGr <3                       */
        /*-----------------------------------------------------------------*/


        var canvas = document.getElementById("QRLBackground") as HTMLCanvasElement,
            ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        var stars: {
            x: number,
            y: number,
            radius: number,
            vx: number,
            vy: number
        }[] = [],
            FPS = 60,
            x = Math.floor(window.innerWidth/10),
            mouse = {
                x: 0,
                y: 0
            };

        window.onresize = function() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            x = Math.floor(window.innerWidth/10);

            if (stars.length > x) {
                stars.splice(x, Math.abs(x-stars.length));
            } else  if (stars.length < x) {
                for (var i = 0; i < x; i++) {
                    stars.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        radius: Math.random() * 1 + 1,
                        vx: Math.floor(Math.random() * 50) - 25,
                        vy: Math.floor(Math.random() * 50) - 25
                    });
                }
            }

            for (var i = 0; i < stars.length; i++) {
                if (stars[i].x > canvas.width || stars[i].y > canvas.height || stars[i].x < 0 || stars[i].y < 0) {
                    stars[i] = {
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        radius: Math.random() * 1 + 1,
                        vx: Math.floor(Math.random() * 50) - 25,
                        vy: Math.floor(Math.random() * 50) - 25
                    };
                }
            }

        }


        for (var i = 0; i < x; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1 + 1,
                vx: Math.floor(Math.random() * 50) - 25,
                vy: Math.floor(Math.random() * 50) - 25
            });
        }

        function draw() {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            
            ctx.globalCompositeOperation = "lighter";
            
            for (var i = 0, x = stars.length; i < x; i++) {
                var s = stars[i];
            
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = 'black';
                ctx.stroke();
            }
            
            ctx.beginPath();
            for (var i = 0, x = stars.length; i < x; i++) {
                var starI = stars[i];
                ctx.moveTo(starI.x,starI.y); 
                if(distance(mouse, starI) < 150) ctx.lineTo(mouse.x, mouse.y);
                for (var j = 0, x = stars.length; j < x; j++) {
                    var starII = stars[j];
                    if(distance(starI, starII) < 150) {
                        ctx.lineTo(starII.x,starII.y); 
                    }
                }
            }
            ctx.lineWidth = 0.05;
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }

        function distance( point1:{
            x: number,
            y: number,
            radius?: number,
            vx?: number,
            vy?: number
        }, point2:{
            x: number,
            y: number,
            radius: number,
            vx: number,
            vy: number
        } ){
            var xs = 0;
            var ys = 0;
            
            xs = point2.x - point1.x;
            xs = xs * xs;
            
            ys = point2.y - point1.y;
            ys = ys * ys;
            
            return Math.sqrt( xs + ys );
        }

        function update() {
            for (var i = 0, x = stars.length; i < x; i++) {
                var s = stars[i];
            
                s.x += s.vx / FPS;
                s.y += s.vy / FPS;
                
                if (s.x < 0 || s.x > canvas.width) s.vx = -s.vx;
                if (s.y < 0 || s.y > canvas.height) s.vy = -s.vy;
            }
        }

        canvas.addEventListener('mousemove', function(e){
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        let lastFrameTime = 0;
        const frameRate = 30;  // 30 FPS
        function tick() {
            const currentFrameTime = Date.now();
            const timeSinceLastFrame = currentFrameTime - lastFrameTime;
        
            if (timeSinceLastFrame >= 1000 / frameRate) {
                draw();
                update();
                lastFrameTime = currentFrameTime;
            }
        
            requestAnimationFrame(tick);
        }

        tick();

    }, []);

    return <canvas style={{
        position: "fixed",
        top: 0,
        left: 0,
        background: color
    }}  id="QRLBackground"></canvas>
}