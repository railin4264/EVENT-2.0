'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ticketService } from '@/services';
import type { Ticket } from '@/services/TicketService';
import QRCode from 'react-qr-code';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const result = await ticketService.getTicketById(ticketId);
      setTicket(result);
    } catch (error) {
      console.error('Error loading ticket:', error);
      alert('Failed to load ticket');
      router.push('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `ticket-${ticketId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">Ticket Not Found</h2>
          <button
            onClick={() => router.push('/tickets')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const event = typeof ticket.event === 'object' ? ticket.event : null;
  const isActive = ticket.status === 'active';
  const isExpired = new Date(ticket.validUntil) < new Date();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back Button */}
      <button
        onClick={() => router.push('/tickets')}
        className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to Tickets
      </button>

      {/* QR Code Section */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center">
        <div className="flex justify-center mb-6">
          <div id="qr-code" className="bg-white p-4 rounded-lg">
            <QRCode value={ticket.qrCode} size={256} />
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-2">Ticket Number</div>
        <div className="text-xl font-mono font-bold mb-4">
          #{ticket._id.slice(-8).toUpperCase()}
        </div>

        <div
          className={`inline-block px-6 py-2 rounded-full text-sm font-medium ${
            ticket.status === 'active' && !isExpired
              ? 'bg-green-100 text-green-700'
              : ticket.status === 'used'
              ? 'bg-gray-100 text-gray-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {ticket.status === 'used'
            ? 'Used'
            : isExpired
            ? 'Expired'
            : 'Active'}
        </div>

        {isActive && !isExpired && (
          <div className="mt-6">
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Download QR Code
            </button>
          </div>
        )}
      </div>

      {/* Event Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Event Details</h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">Event Name</div>
            <div className="text-lg font-medium">{event?.title || 'Event'}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Date & Time</div>
            <div className="font-medium">
              📅{' '}
              {new Date(event?.date || ticket.validFrom).toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }
              )}
            </div>
            <div className="font-medium">
              🕐{' '}
              {new Date(event?.date || ticket.validFrom).toLocaleTimeString(
                'en-US',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Location</div>
            <div className="font-medium">
              📍 {event?.location?.address || 'Location TBD'}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Ticket Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Type</span>
            <span className="font-medium">{ticket.ticketType.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price</span>
            <span className="font-medium">
              {ticket.currency} {ticket.price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Purchase Date</span>
            <span className="font-medium">
              {new Date(ticket.purchaseDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Valid From</span>
            <span className="font-medium">
              {new Date(ticket.validFrom).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Valid Until</span>
            <span className="font-medium">
              {new Date(ticket.validUntil).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Usage History */}
      {ticket.usedAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-2 text-green-700">
            ✓ Ticket Used
          </h2>
          <p className="text-green-600">
            This ticket was used on {new Date(ticket.usedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Warning Messages */}
      {isExpired && !ticket.usedAt && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-2 text-red-700">
            ⚠️ Ticket Expired
          </h2>
          <p className="text-red-600">
            This ticket expired on{' '}
            {new Date(ticket.validUntil).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">Terms & Conditions</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• This ticket is non-refundable</li>
          <li>• Valid for one-time entry only</li>
          <li>• ID verification may be required at the venue</li>
          <li>• Screenshots are not accepted - show the original QR code</li>
          <li>• Event organizers reserve the right to refuse entry</li>
          <li>• Ticket cannot be transferred without prior authorization</li>
        </ul>
      </div>

      {/* Actions */}
      {isActive && !isExpired && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push(`/events/${event?._id}`)}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            View Event Details
          </button>
          <button
            onClick={() => {
              navigator.share?.({
                title: `My ticket for ${event?.title}`,
                text: `Check out my ticket for ${event?.title}!`,
                url: window.location.href,
              });
            }}
            className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium"
          >
            Share Ticket
          </button>
        </div>
      )}
    </div>
  );
}