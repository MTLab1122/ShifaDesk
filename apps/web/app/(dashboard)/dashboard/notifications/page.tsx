'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MOCK_NOTIFICATIONS, MockNotification } from '@/lib/mock-data';
import { Bell, Calendar, ListOrdered, ShieldAlert, Check, CheckCheck, Trash2 } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<MockNotification[]>(MOCK_NOTIFICATIONS);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

  const filtered = notifications.filter((n) =>
    categoryFilter === 'all' ? true : n.category === categoryFilter,
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Notifications Center</h1>
            {unreadCount > 0 && (
              <Badge className="bg-clinical-600 text-white hover:bg-clinical-700">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Real-time clinic alerts, patient appointment bookings, and system updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs">
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 pb-2 border-b">
        {(['all', 'appointment', 'queue', 'system'] as const).map((cat) => (
          <Button
            key={cat}
            variant={categoryFilter === cat ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter(cat)}
            className={`capitalize text-xs ${
              categoryFilter === cat ? 'bg-clinical-600 text-white hover:bg-clinical-700' : ''
            }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p>No notifications in this category.</p>
          </Card>
        ) : (
          filtered.map((item) => {
            const Icon =
              item.category === 'appointment'
                ? Calendar
                : item.category === 'queue'
                ? ListOrdered
                : ShieldAlert;

            return (
              <Card
                key={item.id}
                className={`transition-colors ${
                  !item.read ? 'border-l-4 border-l-clinical-600 bg-clinical-50/20' : ''
                }`}
              >
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full mt-0.5 ${
                        item.category === 'appointment'
                          ? 'bg-blue-100 text-blue-700'
                          : item.category === 'queue'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{item.title}</h4>
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-clinical-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.message}</p>
                      <span className="text-[11px] text-muted-foreground block pt-1">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!item.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteNotification(item.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
