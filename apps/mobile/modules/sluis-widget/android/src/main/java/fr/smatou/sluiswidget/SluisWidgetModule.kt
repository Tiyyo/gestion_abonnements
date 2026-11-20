package fr.smatou.sluiswidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Pont JS → widget : enregistre l'instantané calculé par l'app et redessine les widgets posés. */
class SluisWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SluisWidget")

    Function("setSnapshot") { json: String ->
      appContext.reactContext?.applicationContext?.let { context ->
        WidgetStore.save(context, json)
        NextTransferWidget.updateAll(context)
      }
    }
  }
}
