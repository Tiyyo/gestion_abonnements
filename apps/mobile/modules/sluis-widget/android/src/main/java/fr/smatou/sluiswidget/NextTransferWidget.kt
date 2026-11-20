package fr.smatou.sluiswidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews

/**
 * Widget « Prochain transfert » (2×1 extensible en 4×1). Il affiche l'image du jour de l'instantané écrit par l'app,
 * et se redessine quand l'app écrit un nouvel instantané, à minuit (alarme non réveillante), au changement d'heure
 * ou de fuseau, et à la mise à jour périodique du système (updatePeriodMillis).
 */
class NextTransferWidget : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_MIDNIGHT, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> updateAll(context)
    }
  }

  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) {
      render(context, manager, id)
    }
    scheduleMidnight(context)
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
    render(context, manager, appWidgetId)
  }

  override fun onDisabled(context: Context) {
    alarmManager(context).cancel(midnightIntent(context))
  }

  companion object {
    private const val ACTION_MIDNIGHT = "fr.smatou.sluiswidget.MIDNIGHT"
    private const val APP_URL = "abonnements:///"
    private const val WIDE_MIN_DP = 200

    /** Redessine tous les widgets posés ; sans widget, ne fait rien. */
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, NextTransferWidget::class.java))
      if (ids.isEmpty()) {
        return
      }
      for (id in ids) {
        render(context, manager, id)
      }
      scheduleMidnight(context)
    }

    private fun render(context: Context, manager: AppWidgetManager, id: Int) {
      val wide = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) >= WIDE_MIN_DP
      val views = RemoteViews(context.packageName, if (wide) R.layout.sluis_widget_wide else R.layout.sluis_widget_small)
      bind(views, WidgetStore.currentFrame(context, WidgetStore.today()))
      views.setOnClickPendingIntent(android.R.id.background, openAppIntent(context))
      manager.updateAppWidget(id, views)
    }

    private fun bind(views: RemoteViews, frame: WidgetFrame?) {
      val state = frame?.state ?: "missing"
      views.setTextViewText(R.id.sluis_widget_caption, frame?.caption ?: "")
      views.setViewVisibility(R.id.sluis_widget_caption, if (state == "next") View.VISIBLE else View.GONE)
      views.setTextViewText(R.id.sluis_widget_overdue, frame?.caption ?: "")
      views.setViewVisibility(R.id.sluis_widget_overdue, if (state == "overdue") View.VISIBLE else View.GONE)
      views.setTextViewText(R.id.sluis_widget_headline, frame?.headline ?: "Ouvre Sluis")
      val amount = state == "next" || state == "overdue"
      views.setTextViewTextSize(R.id.sluis_widget_headline, TypedValue.COMPLEX_UNIT_SP, if (amount) 24f else 16f)
      views.setTextViewText(R.id.sluis_widget_detail, frame?.detail ?: "pour afficher le prochain transfert")
      views.setContentDescription(android.R.id.background, frame?.label ?: "Ouvre Sluis pour afficher le prochain transfert.")
    }

    private fun openAppIntent(context: Context): PendingIntent {
      // Lien profond vers l'Accueil (schéma « abonnements » d'app.json), reçu par MainActivity (singleTask).
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun alarmManager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun midnightIntent(context: Context): PendingIntent {
      val intent = Intent(context, NextTransferWidget::class.java).setAction(ACTION_MIDNIGHT)
      return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    /** Alarme inexacte et non réveillante : le passage au jour suivant s'affiche au plus tard au réveil de l'écran. */
    private fun scheduleMidnight(context: Context) {
      alarmManager(context).set(AlarmManager.RTC, WidgetStore.nextMidnightMillis(), midnightIntent(context))
    }
  }
}
