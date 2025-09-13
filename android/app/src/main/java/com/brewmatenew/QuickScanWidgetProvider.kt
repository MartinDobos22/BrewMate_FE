package com.brewmatenew

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class QuickScanWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_quickscan)

            val prefs = context.getSharedPreferences("BrewMateWidget", Context.MODE_PRIVATE)
            val tip = prefs.getString("dailyTip", "") ?: ""
            views.setTextViewText(R.id.txt_tip, tip)

            val intent = Intent(context, MainActivity::class.java).apply {
                putExtra("route", "Scanner")
            }
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.btn_scan, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
