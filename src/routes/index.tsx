import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/public/HomePage';
import { BookingFlowLayout, BookingPage } from '../pages/public/BookingPage';

export const router = createBrowserRouter([
  { element: <BookingFlowLayout />, children: [
    { path: '/', element: <HomePage /> },
    { path: '/reservation', element: <BookingPage /> },
  ] },
  { path: '*', element: <Navigate to="/" replace /> },
]);
