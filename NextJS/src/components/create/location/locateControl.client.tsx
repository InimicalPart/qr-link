"use client";

import { createControlComponent } from '@react-leaflet/core';
import * as L from 'leaflet';
import LLC from 'leaflet.locatecontrol';
import 'leaflet.locatecontrol/dist/L.Control.Locate.css';



interface P extends L.ControlOptions {}
export const LocateControl = createControlComponent((props: P) => {
    if (!(L.Control as any).Locate) LLC(L);
    
    const { Locate } = (L.Control as any);


    return new Locate(props);
})