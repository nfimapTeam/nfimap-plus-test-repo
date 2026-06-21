import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Loading from './pages/Loading';
import Share from './pages/Nfiti/components/Share';

// Lazy load the page components
const Home = lazy(() => import('./pages/Home'));
const NfititTestFlow = lazy(() => import('./pages/Nfiti/NfitiTestFlow'));
const Ticketing = lazy(() => import('./pages/Ticketing'));
const InterparkHome = lazy(() => import('./pages/Ticketing/Interpark/InterparkHome'));
const InterparkBooking = lazy(() => import('./pages/Ticketing/Interpark/InterparkBooking'));
const TicketlinkHome = lazy(() => import('./pages/Ticketing/Ticketlink/TicketlinkHome'));
const TicketlinkBooking = lazy(() => import('./pages/Ticketing/Ticketlink/TicketlinkBooking'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

const App = () => {
  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nfiti" element={<NfititTestFlow />} />
          <Route path="/nfiti/ENT" element={<Share nfiti='ENT' />} />
          <Route path="/nfiti/EST" element={<Share nfiti='EST' />} />
          <Route path="/nfiti/INT" element={<Share nfiti='INT' />} />
          <Route path="/nfiti/IST" element={<Share nfiti='IST' />} />
          <Route path="/nfiti/ENF" element={<Share nfiti='ENF' />} />
          <Route path="/nfiti/ESF" element={<Share nfiti='ESF' />} />
          <Route path="/nfiti/ISF" element={<Share nfiti='ISF' />} />
          <Route path="/nfiti/INF" element={<Share nfiti='INF' />} />
          <Route path="/ticketing" element={<Ticketing />} />
          <Route path="/ticketing/nfiapark" element={<InterparkHome />} />
          <Route path="/ticketing/nfiapark/booking" element={<InterparkBooking />} />
          <Route path="/ticketing/nfialink" element={<TicketlinkHome />} />
          <Route path="/ticketing/nfialink/booking" element={<TicketlinkBooking />} />
          <Route path="/*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default App;
