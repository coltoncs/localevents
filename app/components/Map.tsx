import { useState, useRef, useEffect, useMemo } from 'react';
import Map, { Popup, GeolocateControl, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css'; // Essential CSS
import type { MapRef } from 'react-map-gl/mapbox';
import type { CircleLayer, SymbolLayer } from 'react-map-gl/mapbox';
import { formatDate } from '~/utils/dateFormatter';
import FavoriteButton from './FavoriteButton';

interface MapComponentProps {
  events: any[]
  selectedEvent: any
  selectEvent: (event: any) => void
  voteCounts?: Record<string, number>
  userVotes?: string[]
  isAuthenticated?: boolean
}

function MapComponent({
  events,
  selectedEvent,
  selectEvent,
  voteCounts = {},
  userVotes = [],
  isAuthenticated = false,
}: MapComponentProps) {
  const userVotesSet = new Set(userVotes);
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: -78.6382,
    latitude: 35.7796,
    zoom: 9
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isEventListCollapsed, setIsEventListCollapsed] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cursor, setCursor] = useState<string>('auto');

  // Helper function to get date string in US Eastern Time
  const getEasternDateString = (date: Date = new Date()) => {
    return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      .toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    return getEasternDateString();
  });

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const isPreviousDayDisabled = () => {
    if (!selectedDate) return;
    const today = getEasternDateString();

    // Calculate previous day in US Eastern time
    const selectedDateObj = new Date(selectedDate + 'T12:00:00'); // Use noon to avoid timezone edge cases
    selectedDateObj.setDate(selectedDateObj.getDate() - 1);

    // Convert to Eastern time date string
    const previousDayString = new Date(selectedDateObj.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      .toISOString().split('T')[0];

    return previousDayString < today;
  };

  const today = getEasternDateString();

  // Filter events by selected date
  const filteredEvents = events.filter((event) => {
    if (!event.date) return false;
    // Normalize the event date to YYYY-MM-DD format for comparison
    const eventDate = new Date(event.date).toISOString().split('T')[0];
    return eventDate === selectedDate;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clear selected event if it's not in the filtered events
  useEffect(() => {
    if (selectedEvent && !filteredEvents.find(e => e.id === selectedEvent.id)) {
      selectEvent(null);
    }
  }, [selectedDate, selectedEvent, filteredEvents, selectEvent]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Sort events by proximity to user location
  const sortedFilteredEvents = userLocation && filteredEvents.length > 0
    ? [...filteredEvents].sort((a, b) => {
        if (!a.coordinates || !b.coordinates) return 0;
        const distA = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          a.coordinates.lat,
          a.coordinates.lng
        );
        const distB = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          b.coordinates.lat,
          b.coordinates.lng
        );
        return distA - distB;
      })
    : filteredEvents;

  // Group events by city
  const groupedByCity = sortedFilteredEvents.reduce((acc, event) => {
    const city = event.city || 'Unknown Location';
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(event);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort cities by proximity of closest event in each city
  const sortedCities = Object.keys(groupedByCity).sort((cityA, cityB) => {
    if (!userLocation) return 0;

    const closestInA = groupedByCity[cityA].find((e: any) => e.coordinates);
    const closestInB = groupedByCity[cityB].find((e: any) => e.coordinates);

    if (!closestInA?.coordinates || !closestInB?.coordinates) return 0;

    const distA = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      closestInA.coordinates.lat,
      closestInA.coordinates.lng
    );
    const distB = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      closestInB.coordinates.lat,
      closestInB.coordinates.lng
    );

    return distA - distB;
  });

  const handleEventListItemClick = (event: any) => {
    selectEvent(event);
    if (event.coordinates && mapRef.current) {
      mapRef.current.flyTo({
        center: [event.coordinates.lng, event.coordinates.lat + 0.003],
        zoom: 15.01,
        duration: 1500,
        essential: true
      });
    }
  };

  const handleGeolocate = (e: any) => {
    if (e.coords) {
      setUserLocation({
        latitude: e.coords.latitude,
        longitude: e.coords.longitude
      });
    }
  };

  // Convert events to GeoJSON for clustering
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredEvents
      .filter(event => event.coordinates)
      .map(event => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [event.coordinates.lng, event.coordinates.lat]
        },
        properties: {
          id: event.id,
          title: event.title,
          selected: selectedEvent?.id === event.id
        }
      }))
  }), [filteredEvents, selectedEvent]);

  // Layer styles for clusters
  const clusterLayer: CircleLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#3b82f6',
        10,
        '#8b5cf6',
        30,
        '#ec4899'
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        10,
        30,
        30,
        40
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff'
    }
  };

  const clusterCountLayer: SymbolLayer = {
    id: 'cluster-count',
    type: 'symbol',
    source: 'events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
    },
    paint: {
      'text-color': '#ffffff'
    }
  };

  const unclusteredPointLayer: CircleLayer = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'case',
        ['get', 'selected'],
        '#ef4444',
        '#3b82f6'
      ],
      'circle-radius': 12,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff'
    }
  };

  // Handle clicks on clusters
  const handleClusterClick = (event: any) => {
    const feature = event.features?.[0];
    if (!feature) return;

    const clusterId = feature.properties.cluster_id;
    const mapboxSource = mapRef.current?.getSource('events') as any;

    if (mapboxSource) {
      mapboxSource.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;

        mapRef.current?.easeTo({
          center: feature.geometry.coordinates,
          zoom: zoom,
          duration: 500
        });
      });
    }
  };

  // Handle clicks on unclustered points
  const handlePointClick = (event: any) => {
    const feature = event.features?.[0];
    if (!feature) return;

    const eventId = feature.properties.id;
    const clickedEvent = filteredEvents.find(e => e.id === eventId);

    if (clickedEvent) {
      selectEvent(clickedEvent);
      mapRef.current?.flyTo({
        center: [clickedEvent.coordinates.lng, clickedEvent.coordinates.lat + 0.003],
        zoom: 15.01,
        duration: 1500,
        essential: true
      });
    }
  };

  return (
    <>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onMouseMove={(e) => {
          const features = e.features;
          if (features && features.length > 0) {
            const feature = features[0];
            if (feature.layer?.id === 'clusters' || feature.layer?.id === 'unclustered-point') {
              setCursor('pointer');
            } else {
              setCursor('auto');
            }
          } else {
            setCursor('auto');
          }
        }}
        onClick={(e) => {
          const features = e.features;
          if (!features || features.length === 0) {
            selectEvent(null);
            return;
          }

          const feature = features[0];
          if (feature.layer?.id === 'clusters') {
            handleClusterClick({ features: [feature] });
          } else if (feature.layer?.id === 'unclustered-point') {
            handlePointClick({ features: [feature] });
          }
        }}
        style={{width: '100vw', height: '100vh'}}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken='pk.eyJ1IjoiY2Nzd2VlbmV5IiwiYSI6ImNsdXVtem5zcDBiZ3AyanNmZGwzamt4d2oifQ.j98Apz4tCtnO2SnlgpntJw'
        interactiveLayerIds={['clusters', 'unclustered-point']}
        cursor={cursor}
      >
        <Source
          id="events"
          type="geojson"
          data={geojsonData}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>

      <GeolocateControl
        position="bottom-right"
        trackUserLocation={true}
        showUserHeading={true}
        onGeolocate={handleGeolocate}
      />

      {selectedEvent && selectedEvent.coordinates && !isMobile && (
        <Popup
          longitude={selectedEvent.coordinates.lng}
          latitude={selectedEvent.coordinates.lat}
          onClose={() => selectEvent(null)}
          closeOnClick={false}
          anchor="bottom"
        >
          <div className="p-2 max-w-sm max-h-[40vh] overflow-y-auto bg-slate-950 text-white rounded-lg">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-lg text-white">{selectedEvent.title}</h3>
              <FavoriteButton
                eventId={selectedEvent.id}
                initialVoted={userVotesSet.has(selectedEvent.id)}
                initialCount={voteCounts[selectedEvent.id] || 0}
                isAuthenticated={isAuthenticated}
                size="md"
                showCount={true}
              />
            </div>
            {selectedEvent.imageUrl && (
              <img
                src={selectedEvent.imageUrl}
                alt={selectedEvent.title}
                className="w-full h-32 object-cover rounded mb-2"
              />
            )}
            <p className="text-sm text-slate-300 mb-2">{selectedEvent.description}</p>
            <div className="text-sm space-y-1 text-slate-300">
              {selectedEvent.date && (
                <p><span className="font-semibold text-white">Date:</span> {formatDate(selectedEvent.date)}</p>
              )}
              {selectedEvent.times && (
                <p><span className="font-semibold text-white">Time:</span> {selectedEvent.times}</p>
              )}
              {selectedEvent.location && (
                <p><span className="font-semibold text-white">Location:</span> {selectedEvent.location}</p>
              )}
              {selectedEvent.address && (
                <p><span className="font-semibold text-white">Address:</span> {selectedEvent.address}</p>
              )}
              {selectedEvent.cost && (
                <p><span className="font-semibold text-white">Cost:</span> {selectedEvent.cost}</p>
              )}
              {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                <p><span className="font-semibold text-white">Categories:</span> {selectedEvent.categories.join(', ')}</p>
              )}
              {selectedEvent.recurrence && (
                <p><span className="font-semibold text-white">Recurrence:</span> {selectedEvent.recurrence}{selectedEvent.endDate && ` (until ${formatDate(selectedEvent.endDate)})`}</p>
              )}
              {selectedEvent.createdByName && (
                <p><span className="font-semibold text-white">Submitted by:</span> {selectedEvent.createdByName}</p>
              )}
            </div>
            {selectedEvent.url && (
              <a
                href={selectedEvent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-blue-400 hover:text-blue-300 text-sm font-semibold"
              >
                View Details →
              </a>
            )}
          </div>
        </Popup>
      )}
      </Map>

      {/* Date Picker - Top on Mobile, Bottom on Desktop */}
      <div className="fixed top-20 lg:top-auto lg:bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl px-4 py-3">
          <button
            onClick={() => changeDate(-1)}
            disabled={isPreviousDayDisabled()}
            className="p-2 hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label="Previous day"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <input
            type="date"
            value={selectedDate}
            min={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          />

          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-slate-800 rounded transition-colors"
            aria-label="Next day"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {selectedEvent && isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950 rounded-t-2xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto border-t border-slate-800">
          <div className="sticky top-0 bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-white">{selectedEvent.title}</h3>
              <FavoriteButton
                eventId={selectedEvent.id}
                initialVoted={userVotesSet.has(selectedEvent.id)}
                initialCount={voteCounts[selectedEvent.id] || 0}
                isAuthenticated={isAuthenticated}
                size="md"
                showCount={true}
              />
            </div>
            <button
              onClick={() => selectEvent(null)}
              className="text-slate-400 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            {selectedEvent.imageUrl && (
              <img
                src={selectedEvent.imageUrl}
                alt={selectedEvent.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <p className="text-sm text-slate-300 mb-4">{selectedEvent.description}</p>
            <div className="text-sm space-y-2 text-slate-300">
              {selectedEvent.date && (
                <p><span className="font-semibold text-white">Date:</span> {formatDate(selectedEvent.date)}</p>
              )}
              {selectedEvent.times && (
                <p><span className="font-semibold text-white">Time:</span> {selectedEvent.times}</p>
              )}
              {selectedEvent.location && (
                <p><span className="font-semibold text-white">Location:</span> {selectedEvent.location}</p>
              )}
              {selectedEvent.address && (
                <p><span className="font-semibold text-white">Address:</span> {selectedEvent.address}</p>
              )}
              {selectedEvent.cost && (
                <p><span className="font-semibold text-white">Cost:</span> {selectedEvent.cost}</p>
              )}
              {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                <p><span className="font-semibold text-white">Categories:</span> {selectedEvent.categories.join(', ')}</p>
              )}
              {selectedEvent.recurrence && (
                <p><span className="font-semibold text-white">Recurrence:</span> {selectedEvent.recurrence}{selectedEvent.endDate && ` (until ${formatDate(selectedEvent.endDate)})`}</p>
              )}
              {/* {selectedEvent.createdByName && (
                <p><span className="font-semibold text-white">Submitted by:</span> {selectedEvent.createdByName}</p>
              )} */}
            </div>
            {selectedEvent.url && (
              <a
                href={selectedEvent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-semibold"
              >
                View Details →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Event List - Left side on desktop, full width on mobile */}
      <div className={`fixed left-4 top-24 lg:top-32 z-40 transition-all duration-300 ${isEventListCollapsed ? 'w-12' : 'w-80 lg:w-96'} max-h-[calc(100vh-200px)]`}>
        <div className="bg-slate-950 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Header with toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700">
            {!isEventListCollapsed && (
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <span>Events ({sortedFilteredEvents.length})</span>
                {userLocation && (
                  <span className="text-xs text-blue-400 font-normal">
                    📍 By distance
                  </span>
                )}
              </h3>
            )}
            <button
              onClick={() => setIsEventListCollapsed(!isEventListCollapsed)}
              className="p-2 hover:bg-slate-800 rounded transition-colors text-white ml-auto"
              aria-label={isEventListCollapsed ? "Expand event list" : "Collapse event list"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isEventListCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* Event list */}
          {!isEventListCollapsed && (
            <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
              {sortedFilteredEvents.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No events for {formatDate(selectedDate)}
                </div>
              ) : (
                <div className='sticky'>
                  {sortedCities.map((city) => (
                    <div key={city}>
                      {/* City header */}
                      <div className="sticky top-0 bg-slate-900 px-3 py-2 border-b border-slate-700 z-10">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                          {city}
                        </h4>
                      </div>

                      {/* Events in this city */}
                      <div className="divide-y divide-slate-700">
                        {groupedByCity[city].map((event: any) => {
                          const distance = userLocation && event.coordinates
                            ? calculateDistance(
                                userLocation.latitude,
                                userLocation.longitude,
                                event.coordinates.lat,
                                event.coordinates.lng
                              )
                            : null;

                          return (
                            <button
                              key={event.id}
                              onClick={() => handleEventListItemClick(event)}
                              className={`w-full p-3 text-left hover:bg-slate-800 transition-colors ${
                                selectedEvent?.id === event.id ? 'bg-slate-800 border-l-4 border-blue-500' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <div className="font-medium text-white text-sm line-clamp-2 flex-1">
                                  {event.title}
                                </div>
                                <div className="flex items-center gap-2">
                                  {distance !== null && (
                                    <div className="text-xs text-blue-400 whitespace-nowrap">
                                      {distance.toFixed(1)} mi
                                    </div>
                                  )}
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FavoriteButton
                                      eventId={event.id}
                                      initialVoted={userVotesSet.has(event.id)}
                                      initialCount={voteCounts[event.id] || 0}
                                      isAuthenticated={isAuthenticated}
                                      size="sm"
                                      showCount={false}
                                    />
                                  </div>
                                </div>
                              </div>
                              {event.cost && (
                                <div className="text-xs text-green-400">
                                  {event.cost}
                                </div>
                              )}
                              {event.times && (
                                <div className="text-xs text-slate-400 mt-1">
                                  {event.times}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MapComponent;