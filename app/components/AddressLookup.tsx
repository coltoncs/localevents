import { useState } from 'react'
import { toast } from 'sonner'

interface AddressLookupProps {
  defaultAddress?: string
  defaultCity?: string
  defaultRegion?: string
  defaultLatitude?: number
  defaultLongitude?: number
}

export function AddressLookup({
  defaultAddress = '',
  defaultCity = '',
  defaultRegion = '',
  defaultLatitude,
  defaultLongitude,
}: AddressLookupProps) {
  const [address, setAddress] = useState(defaultAddress)
  const [city, setCity] = useState(defaultCity)
  const [region, setRegion] = useState(defaultRegion)
  const [latitude, setLatitude] = useState(defaultLatitude?.toString() ?? '')
  const [longitude, setLongitude] = useState(defaultLongitude?.toString() ?? '')
  const [isLookingUp, setIsLookingUp] = useState(false)

  const handleLookup = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address first')
      return
    }

    setIsLookingUp(true)

    try {
      const formData = new FormData()
      formData.append('address', address)
      if (city) formData.append('city', city)
      if (region) formData.append('region', region)

      const response = await fetch('/api/geocode', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lookup address')
      }

      setLatitude(data.latitude.toString())
      setLongitude(data.longitude.toString())
      toast.success('Coordinates found!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to lookup address')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-2">
          Address
        </label>
        <input
          id="address"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
          placeholder="123 Main St"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium mb-2">
            City
          </label>
          <input
            id="city"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none capitalize"
            placeholder="Raleigh"
          />
        </div>
        <div>
          <label htmlFor="region" className="block text-sm font-medium mb-2">
            Region
          </label>
          <input
            id="region"
            name="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none capitalize"
            placeholder="Downtown"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">Coordinates</span>
          <div className="relative group">
            <svg
              className="w-4 h-4 text-slate-400 cursor-help"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeWidth="2" d="M12 16v-4M12 8h.01" />
            </svg>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Required for map. Tip: Enter an address and use the lookup button.
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="latitude" className="block text-sm font-medium mb-2">
              Latitude
            </label>
            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., 35.7796"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="longitude" className="block text-sm font-medium mb-2">
              Longitude
            </label>
            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., -78.6382"
            />
          </div>
          <button
            type="button"
            onClick={handleLookup}
            disabled={isLookingUp || !address.trim()}
            className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {isLookingUp ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Looking up...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Lookup Coordinates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
