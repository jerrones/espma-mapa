/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState } from "react";

interface MunicipalityInfo {
  name: string;
  population: number;
  infos: string;
}

interface GeoFeature {
  type: string;
  properties: {
    name: string;
    codarea: number;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

const MapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [municipalities, setMunicipalities] = useState<MunicipalityInfo[]>([]);
  const [selectedMunicipality, setSelectedMunicipality] =
    useState<MunicipalityInfo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const geoResponse = await fetch("/geojs-21-mun.json");
      const geoJson = await geoResponse.json();
      setGeoData(geoJson);

      const muniResponse = await fetch("/maranhao-municipios.json");
      const muniJson = await muniResponse.json();
      setMunicipalities(muniJson);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!geoData || municipalities.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Determine bounds
    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    geoData.features.forEach((feature: GeoFeature) => {
      const coords = feature.geometry.coordinates;
      coords.forEach((polygon: any) => {
        polygon.forEach((point: number[]) => {
          const [x, y] = point;
          if (x < bounds.minX) bounds.minX = x;
          if (y < bounds.minY) bounds.minY = y;
          if (x > bounds.maxX) bounds.maxX = x;
          if (y > bounds.maxY) bounds.maxY = y;
        });
      });
    });

    const scaleX = width / (bounds.maxX - bounds.minX);
    const scaleY = height / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = -bounds.minX;
    const offsetY = -bounds.minY;

    // Draw each municipality
    geoData.features.forEach((feature: GeoFeature, index: number) => {
      const coords = feature.geometry.coordinates;
      ctx.beginPath();
      coords.forEach((polygon: any) => {
        polygon.forEach((point: number[], i: number) => {
          const x = (point[0] + offsetX) * scale;
          const y = height - (point[1] + offsetY) * scale;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
      });
      ctx.closePath();
      ctx.fillStyle = `hsl(${(index * 137.5) % 360}, 60%, 70%)`;
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.stroke();
    });

    // Handle click events
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < geoData.features.length; i++) {
        const feature = geoData.features[i];
        const coords = feature.geometry.coordinates;
        ctx.beginPath();
        coords.forEach((polygon: any) => {
          polygon.forEach((point: number[], j: number) => {
            const px = (point[0] + offsetX) * scale;
            const py = height - (point[1] + offsetY) * scale;
            if (j === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          });
        });
        ctx.closePath();
        if (ctx.isPointInPath(x, y)) {
          const muniName = feature.properties.name;
          const muniInfo = municipalities.find((m) => m.name === muniName);
          if (muniInfo) {
            setSelectedMunicipality(muniInfo);
          }
          break;
        }
      }
    };

    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("click", handleClick);
    };
  }, [geoData, municipalities]);

  return (
    <div className="flex justify-center items-center">
      <div className="w-full h-54 bg-red">
        <h2>Mapa de atuação da ESPMA</h2>
      </div>
      <div className="">
        <canvas ref={canvasRef} width={600} height={800} />
      </div>
      {selectedMunicipality && (
        <div className="absolute top-0 bg-white border border-gray-300 p-4 rounded shadow-lg">
          <h2 className="text-lg font-bold">{selectedMunicipality.name}</h2>
          <p>População: {selectedMunicipality.population.toLocaleString()}</p>
          <p>{selectedMunicipality.infos}</p>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => setSelectedMunicipality(null)}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
};

export default MapCanvas;
