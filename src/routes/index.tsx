import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/public/HomePage';
import { AdvisorPage } from '../pages/public/AdvisorPage';
import { StudioPage } from '../pages/public/StudioPage';
import { PreparePage } from '../pages/public/PreparePage';
import { BookingFlowLayout, BookingPage } from '../pages/public/BookingPage';

export const router = createBrowserRouter([
  { element: <BookingFlowLayout />, children: [
    { path: '/', element: <HomePage /> },
    { path: '/conseiller', element: <AdvisorPage /> },
    { path: '/studio', element: <StudioPage /> },
    { path: '/preparer-live', element: <PreparePage /> },
    { path: '/reservation', element: <BookingPage /> },
  ] },
  { path: '*', element: <Navigate to="/" replace /> },
]);
