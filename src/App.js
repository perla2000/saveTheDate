import { Routes, Route, useLocation } from "react-router-dom";
import Envelope from "./Envelope/Envelope";
import Details from "./Details/Details";
import Guest from "./RSVP/Guest";
import SaveTheDate from "./SaveTheDate/SaveTheDate";

function DetailsPage({ guestId }) {
  return (
    <>
      <Details />
      <Guest guestId={guestId} />
    </>
  );
}

function App() {
  // const location = useLocation();
  // const queryParams = new URLSearchParams(location.search);
  // const guestId = queryParams.get("guestId");
  // console.log(queryParams)
  const guestId = 123;
  return (
    <div class="root-class">
      <Routes>
        {/* <Route path="/" element={<Envelope />} />
        <Route path="/details" element={<DetailsPage guestId={guestId} />} /> */}
        <Route path="/" element={<SaveTheDate />} />
      </Routes>
    </div>
  );
}

export default App;
