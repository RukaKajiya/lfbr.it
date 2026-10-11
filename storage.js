window.LFBRStorage = (() => {
  const KEY = "lfbr_travel_v1";
  const PREFS_KEY = "lfbr_travel_profile_v1";

  function read(key){
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch(e){ return null; }
  }
  function write(key,value){
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
  return {
    saveTrip(trip){ return write(KEY, trip); },
    loadTrip(){ return read(KEY); },
    clearTrip(){ localStorage.removeItem(KEY); },
    saveProfile(profile){ return write(PREFS_KEY, profile); },
    loadProfile(){ return read(PREFS_KEY); }
  };
})();