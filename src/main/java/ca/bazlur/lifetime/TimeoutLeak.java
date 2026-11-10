package ca.bazlur.lifetime;

import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeoutException;

import static java.util.concurrent.TimeUnit.MILLISECONDS;

public class TimeoutLeak {

    private final long start = System.nanoTime();

    void main() throws Exception {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<String> reservation = executor.submit(this::reserve);
            try {
                log(reservation.get(200, MILLISECONDS));
            } catch (TimeoutException e) {
                log("timed out, customer told to try again");
            }
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
