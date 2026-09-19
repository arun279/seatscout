import type { Movie, Search, SeatGroupResult } from "@seatscout/client";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import {
  Button,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deviceSeatScout, listingDate } from "./source";

const seatscout = deviceSeatScout();
const PARTY_SIZE = 2;

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 8, padding: 16 },
  input: { borderRadius: 8, borderWidth: 1, fontSize: 16, padding: 12 },
  line: { fontSize: 13 },
  name: { fontSize: 15, fontWeight: "600" },
  group: { borderTopWidth: 1, gap: 2, paddingVertical: 10 },
  movies: { flexGrow: 0, maxHeight: 168 },
});

const seatsOf = (result: SeatGroupResult) =>
  result.seats.map((seat) => seat.id).join("·");

const formatsOf = (result: SeatGroupResult) => {
  const { formats } = result.showtime.presentation;
  return formats.length === 0 ? "standard" : formats.join(" · ");
};

const Group = ({ result }: { readonly result: SeatGroupResult }) => (
  <View style={styles.group}>
    <Text style={styles.name}>{result.showtime.presentation.theater.name}</Text>
    <Text style={styles.line}>
      {result.showtime.startsAt.slice(11, 16)} · {formatsOf(result)} ·{" "}
      {seatsOf(result)}
    </Text>
    <Text style={styles.line}>
      Row {result.reasons.rowFromFront} of {result.reasons.rowCount}
    </Text>
  </View>
);

const Ranked = ({ search }: { readonly search: Search }) => {
  const { results, coverage, phase } = useSyncExternalStore(
    search.subscribe,
    search.snapshot,
  );
  return (
    <>
      <Text style={styles.line}>
        {phase} · {coverage.candidates} candidates · {coverage.checked} checked
        · {coverage.failed.length} unreached · {results.length} seat groups
      </Text>
      <FlatList
        data={results}
        keyExtractor={(result) => result.key}
        renderItem={({ item }) => <Group result={item} />}
      />
    </>
  );
};

export const Screen = (): ReactElement => {
  const [area, setArea] = useState("75010");
  const [movies, setMovies] = useState<readonly Movie[]>([]);
  const [note, setNote] = useState("Name an area, then read what is playing.");
  const [search, setSearch] = useState<Search | null>(null);

  const stop = () => {
    search?.abort();
    setSearch(null);
  };

  const readProgramme = async () => {
    stop();
    setNote(`Reading what is playing near ${area}`);
    const reading = await seatscout.programme(area, listingDate(new Date()));
    setMovies(reading.ok ? reading.payload.movies : []);
    setNote(
      reading.ok
        ? `${reading.payload.movies.length} films at ${reading.payload.theaters.length} theaters near ${area}`
        : `What is playing could not be read: ${reading.reason}`,
    );
  };

  const find = (movie: Movie) => {
    stop();
    setNote(`${movie.title} · ${PARTY_SIZE} seats together · near ${area}`);
    setSearch(
      seatscout.search({
        movie: movie.id,
        date: listingDate(new Date()),
        area,
        partySize: PARTY_SIZE,
        accessibleSeating: false,
      }),
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <TextInput
        accessibilityLabel="Near, by postal code"
        autoCorrect={false}
        inputMode="numeric"
        onChangeText={setArea}
        style={styles.input}
        value={area}
      />
      <Button
        onPress={() => {
          void readProgramme();
        }}
        title="Read what is playing"
      />
      <Text style={styles.line}>{note}</Text>
      <ScrollView style={styles.movies}>
        {movies.map((movie) => (
          <Button
            key={movie.id}
            onPress={() => find(movie)}
            title={movie.title}
          />
        ))}
      </ScrollView>
      {search !== null && <Ranked search={search} />}
    </SafeAreaView>
  );
};
