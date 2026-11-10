package ca.bazlur.lifetime;

import java.time.Duration;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.Joiner;

public class TimeoutStructured {

    private final long start = System.nanoTime();

    void main() throws InterruptedException {
        try (var scope = StructuredTaskScope.open(
                Joiner.awaitAllSuccessfulOrThrow(),
                config -> config.withTimeout(Duration.ofMillis(200)))) {
            var reservation = scope.fork(this::reserve);
            scope.join();
            log(reservation.get());
        } catch (StructuredTaskScope.TimeoutException e) {
            log("timed out, customer told to try again");
        }
        log("handler returned");
    }

    private String reserve() throws InterruptedException {
        log("charging card");
        try {
            Thread.sleep(1800);
        } catch (InterruptedException e) {
            log("payment cancelled");
            throw e;
        }
        log("card charged");
        return "seat confirmed";
    }

    private void log(String message) {
        long millis = (System.nanoTime() - start) / 1_000_000;
        IO.println("%5d ms  %s".formatted(millis, message));
    }
}
