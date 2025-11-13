package com.example.happydining.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_settings")

class UserSettingsManager(private val context: Context) {
    companion object {
        val ALLERGIES_KEY = stringSetPreferencesKey("selected_allergies")
        val DISLIKES_KEY = stringSetPreferencesKey("selected_dislikes")
    }

    val allergies: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[ALLERGIES_KEY] ?: emptySet()
    }

    val dislikes: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[DISLIKES_KEY] ?: emptySet()
    }

    suspend fun saveAllergies(allergies: Set<String>) {
        context.dataStore.edit { settings ->
            settings[ALLERGIES_KEY] = allergies
        }
    }

    suspend fun saveDislikes(dislikes: Set<String>) {
        context.dataStore.edit { settings ->
            settings[DISLIKES_KEY] = dislikes
        }
    }
}